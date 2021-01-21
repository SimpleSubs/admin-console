import React from "react";
import { useTable, useRowSelect, useFlexLayout, useSortBy, useGlobalFilter, useAsyncDebounce, usePagination } from "react-table";
import { useDrag, useDrop } from "react-dnd";
import update from "immutability-helper";
import Checkbox, { IndeterminateCheckbox } from "./Checkbox";
import { TableTypes, ColumnSizes } from "../constants/TableActions";
import { toReadable } from "../constants/Date";
import "../stylesheets/Table.scss";
import EditRowForm from "./EditRowForm";

const PAGE_SIZE = 50;

const CellGenerator = ({ type = TableTypes.TEXT, value }) => (
  type === TableTypes.BOOLEAN ?
    <Checkbox checked={value} disabled /> :
    <p>{value}</p>
);

function generateColumn(column) {
  return {
    ...column,
    ...ColumnSizes[column.size],
    Cell: ({ cell }) => <CellGenerator type={cell.column.type} value={cell.value} />
  }
}

function prepHeaders({ key, title, type = TableTypes.TEXT, size = "MEDIUM", sortType = "alphanumeric" }) {
  return {
    Header: title,
    accessor: key,
    type,
    size,
    sortType
  }
}

function prepData(row, columns) {
  let displayRow = {};
  for (let column of columns) {
    let cell = row[column.key];
    let type = column.type;
    let toDisplay;
    if (type === TableTypes.CONDITIONAL) {
      type = column.condition(row);
    }
    switch (type) {
      case TableTypes.HIDDEN:
        toDisplay = "N/A";
        break;
      case TableTypes.ARRAY:
        toDisplay = !cell || cell.length === 0 ? "none" : cell.join(", ");
        break;
      case TableTypes.DATE:
        toDisplay = toReadable(cell);
        break;
      case TableTypes.TEXT:
        toDisplay = !cell || cell.length === 0 ? "none" : cell;
        break;
      default:
        toDisplay = cell;
        break;
    }
    if (column.displayValue && type !== TableTypes.HIDDEN) {
      toDisplay = column.displayValue(toDisplay);
    }
    displayRow[column.key] = toDisplay;
  }
  return displayRow;
}

const Row = ({ row, index, currentIndex, moveRow, custom, focusRow, tableId, dragOverIndex, setDragOverIndex, onReorder }) => {
  const dropRef = React.useRef(null);

  const [, drop] = useDrop({
    accept: tableId + "-row",
    hover: (item, monitor) => {
      if (!dropRef.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return; // Don't replace items with themselves
      const hoverBoundingRect = dropRef.current.getBoundingClientRect(); // Determine rectangle on screen
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2; // Get vertical middle
      const clientOffset = monitor.getClientOffset(); // Determine mouse position
      const hoverClientY = clientOffset.y - hoverBoundingRect.top; // Get pixels to the top
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return; // Dragging downwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return; // Dragging upwards
      // Time to actually perform the action
      moveRow(dragIndex, hoverIndex);
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
      setDragOverIndex(hoverIndex);
    }
  });

  const [, drag, preview] = useDrag({
    item: { type: tableId + "-row", prevIndex: index, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: custom,
    end: (item, monitor) => {
      if (!item) return;
      setDragOverIndex(-1);
      onReorder(item.prevIndex, item.index);
    }
  });

  preview(drop(dropRef));
  drag(dropRef);

  return (
    <tr
      ref={dropRef}
      className={"clickable" + (dragOverIndex === index ? " invisible" : "")}
      onClick={() => focusRow(index)}
      {...row.getRowProps()}
    >
      {row.cells.map((cell) => (
        <td
          className={cell.column.id + " " + (cell.column.size ? cell.column.size.toLowerCase() : "")}
          {...cell.getCellProps()}
        >
          {cell.render("Cell", { currentIndex })}
        </td>
      ))}
    </tr>
  );
}

const SearchBar = ({ globalFilter, setGlobalFilter }) => {
  const [value, setValue] = React.useState(globalFilter);
  const onChange = useAsyncDebounce((value) => setGlobalFilter(value || undefined), 200);

  return (
    <div className={"search-bar"}>
      <i className={"fas fa-search"} />
      <input
        type={"text"}
        placeholder={"Search..."}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        value={value || ""}
      />
    </div>
  );
};

const PageButtons = ({ pageCount, pageIndex, canPreviousPage, canNextPage, gotoPage, nextPage, previousPage }) => {
  const [inputValue, setInputValue] = React.useState(pageIndex + 1);

  const setPage = (e) => {
    let value = e.target.value;
    setInputValue(value);
    if (value > 0 && value <= pageCount) {
      gotoPage(value - 1);
    }
  };

  React.useEffect(() => setInputValue(pageIndex + 1), [pageIndex]);

  if (pageCount <= 1) {
    return null;
  } else {
    return (
      <tfoot>
        <tr>
          <td className={"page-buttons"}>
            <button type={"button"} disabled={!canPreviousPage} onClick={() => gotoPage(0)}>
              <i className={"fas fa-chevron-left"} />
              <i className={"fas fa-chevron-left"} />
            </button>
            <button type={"button"} disabled={!canPreviousPage} onClick={previousPage}>
              <i className={"fas fa-chevron-left"} />
            </button>
            <label>
              Page &nbsp;
              <input type={"text"} value={inputValue} onChange={setPage} />
              &nbsp; of {pageCount}
            </label>
            <button type={"button"} disabled={!canNextPage} onClick={nextPage}>
              <i className={"fas fa-chevron-right"} />
            </button>
            <button type={"button"} disabled={!canNextPage} onClick={() => gotoPage(pageCount - 1)}>
              <i className={"fas fa-chevron-right"} />
              <i className={"fas fa-chevron-right"} />
            </button>
          </td>
        </tr>
      </tfoot>
    );
  }
}

const Table = ({ columns = [], data = [], MenuButtons = {}, title, custom = false, onEdit = () => {}, id = "", pushState = () => {}, getDataValues = (data) => data, getColumnValues = (columns) => columns, extraFields = [], extraParams, defaultSortCol }) => {
  // eslint-disable-next-line
  const preppedColumns = React.useMemo(() => getColumnValues(columns).map(prepHeaders), [columns]);
  // eslint-disable-next-line
  const preppedData = React.useMemo(() => getDataValues(data).map((row) => prepData(row, getColumnValues(columns))), [data, columns]);
  const [modalOpen, toggleModal] = React.useState(false);
  const [focusedRow, setFocusedRow] = React.useState(null);
  const [records, setRecords] = React.useState(preppedData);
  const [dragOverIndex, setDragOverIndex] = React.useState(-1);
  const prevSelectedRef = React.useRef(null);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    gotoPage,
    pageCount,
    prepareRow,
    setGlobalFilter,
    toggleRowSelected,
    state: { selectedRowIds, globalFilter, pageIndex }
  } = useTable(
    {
      columns: preppedColumns,
      data: records,
      defaultColumn: ColumnSizes.MEDIUM,
      autoResetGlobalFilter: false,
      autoResetSelectedRows: false,
      autoResetPage: false,
      disableSortRemove: true,
      initialState: {
        sortBy: defaultSortCol ? [{ id: defaultSortCol, desc: false }] : [],
        pageSize: PAGE_SIZE,
        pageIndex: 0
      }
    },
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect,
    useFlexLayout,
    (hooks) => {
      hooks.visibleColumns.push((columns) => [
        {
          id: "selection",
          minWidth: 1,
          width: 1,
          maxWidth: 1,
          Header: ({ getToggleAllRowsSelectedProps }) => {
            const toggleAllRowSelectedProps = getToggleAllRowsSelectedProps();
            const onChange = (e) => {
              toggleAllRowSelectedProps.onChange(e);
              prevSelectedRef.current = null;
            }
            return <IndeterminateCheckbox {...toggleAllRowSelectedProps} onChange={onChange} />;
          },
          Cell: ({ row, currentIndex, rows }) => {
            const toggleRowSelectedProps = row.getToggleRowSelectedProps();
            const onChange = (e) => {
              multiSelect(e, currentIndex, toggleRowSelectedProps.onChange, rows);
              prevSelectedRef.current = { id: row.id, index: currentIndex, checked: e.target.checked };
            }
            return <IndeterminateCheckbox {...toggleRowSelectedProps} onChange={onChange} />;
          }
        },
        ...columns.map(generateColumn)
      ]);
    }
  );

  const multiSelect = (e, index, onChange, rows) => {
    if (!(e.nativeEvent.shiftKey && prevSelectedRef.current)) {
      onChange(e);
      return;
    }
    let prevSelected = prevSelectedRef.current;
    if (index < prevSelected.index) {
      for (let i = prevSelected.index; i >= index; i--) {
        toggleRowSelected(rows[i].id, prevSelected.checked);
      }
    } else {
      for (let i = prevSelected.index; i <= index; i++) {
        toggleRowSelected(rows[i].id, prevSelected.checked);
      }
    }
  }

  const focusRow = (row) => {
    setFocusedRow(row);
    toggleModal(true);
  };

  const moveRow = (dragIndex, hoverIndex) => {
    const dragRecord = records[dragIndex];
    setRecords(
      update(records, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, dragRecord]
        ]
      })
    );
  };

  const onReorder = (dragIndex, hoverIndex) => {
    const dragRecord = data[dragIndex];
    pushState(
      update(data, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, dragRecord]
        ]
      })
    );
  }

  React.useEffect(() => setRecords(preppedData), [setRecords, preppedData]);

  return (
    <>
      <EditRowForm
        fields={[...columns, ...extraFields]}
        id={id}
        prevData={focusedRow !== null ? data[focusedRow] : {}}
        open={modalOpen}
        onSubmit={(editedField) => onEdit(focusedRow, editedField)}
        closeModal={() => toggleModal(false)}
        unfocusRow={() => setFocusedRow(null)}
        custom={custom}
        extraParams={extraParams}
      />
      <table {...getTableProps()}>
        <thead>
          <tr>
            <th className={"menu-button left"}>
              {!custom ? (
                <SearchBar
                  globalFilter={globalFilter}
                  setGlobalFilter={setGlobalFilter}
                />
              ) : (
                <div>
                  {MenuButtons.Left && <MenuButtons.Left selected={selectedRowIds} openModal={() => toggleModal(true)} />}
                </div>
              )}
            </th>
            <th className={"table-title"}>{title}</th>
            <th className={"menu-button right"}>
              <div>
                {MenuButtons.Right && <MenuButtons.Right selected={selectedRowIds} openModal={() => toggleModal(true)} />}
              </div>
            </th>
          </tr>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th
                  className={`${column.id} ${column.isSorted && "space"}`}
                  {...column.getHeaderProps(!custom && column.getSortByToggleProps())}
                >
                  {column.isSorted && (
                    <span className={"sort-arrow-placeholder"}>
                      <i className={"fas fa-arrow-up"} />
                    </span>
                  )}
                  {column.render("Header")}
                  {column.isSorted && (
                    <span className={"sort-arrow " + (column.isSortedDesc ? "down" : "")}>
                      <i className="fas fa-arrow-up" />
                    </span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.length === 0 ?
            <tr className={"no-data"}>
              <td>No data to display</td>
            </tr> :
            page.map((row, index) => {
              prepareRow(row);
              return (
                <Row
                  key={row.id}
                  data={records}
                  custom={custom}
                  focusRow={focusRow}
                  index={row.id}
                  currentIndex={index + (pageIndex * PAGE_SIZE)}
                  row={row}
                  moveRow={moveRow}
                  tableId={id}
                  dragOverIndex={dragOverIndex}
                  setDragOverIndex={setDragOverIndex}
                  onReorder={onReorder}
                />
              );
            })
          }
        </tbody>
        <PageButtons
          canNextPage={canNextPage}
          canPreviousPage={canPreviousPage}
          gotoPage={gotoPage}
          nextPage={nextPage}
          pageCount={pageCount}
          pageIndex={pageIndex}
          previousPage={previousPage}
        />
      </table>
    </>
  )
};

export default Table;