import React from "react";
import { useTable, useRowSelect, useFlexLayout } from "react-table";
import { useDrag, useDrop } from "react-dnd";
import update from "immutability-helper";
import Checkbox, { IndeterminateCheckbox } from "./Checkbox";
import { TableTypes, ColumnSizes } from "../constants/TableActions";
import { toReadable } from "../constants/Date";
import "../stylesheets/Table.css";
import EditRowForm from "./EditRowForm";

const CellGenerator = ({ type = TableTypes.TEXT, value }) => (
  type === TableTypes.CHECKBOX ?
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

function prepHeaders({ key, title, type = TableTypes.TEXT, size = "MEDIUM" }) {
  return {
    Header: title,
    accessor: key,
    type,
    size
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

const Row = ({ row, index, moveRow, editable, focusRow, tableId, dragOverIndex, setDragOverIndex, onReorder }) => {
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
    canDrag: editable,
    end: (item, monitor) => {
      if (!item) return;
      setDragOverIndex(-1);
      onReorder(item.prevIndex, item.index);
    }
  });

  preview(drop(dropRef));
  drag(dropRef);

  return (
    <tr ref={dropRef} className={(editable ? "clickable" : "") + (dragOverIndex === index ? " invisible" : "")} onClick={() => focusRow(index)} {...row.getRowProps()}>
      {row.cells.map((cell) => (
        <td
          className={cell.column.id + " " + (cell.column.size ? cell.column.size.toLowerCase() : "")}
          {...cell.getCellProps()}
        >
          {cell.render("Cell")}
        </td>
      ))}
    </tr>
  );
}

const Table = ({ columns, data, MenuButtons = {}, title, editable = false, onEdit = () => {}, id = "", pushState = () => {} }) => {
  const preppedColumns = React.useMemo(() => columns.map(prepHeaders), [columns]);
  const preppedData = React.useMemo(() => data.map((row) => prepData(row, columns)), [data, columns]);
  const [modalOpen, toggleModal] = React.useState(false);
  const [focusedRow, setFocusedRow] = React.useState(null);
  const [records, setRecords] = React.useState(preppedData);
  const [dragOverIndex, setDragOverIndex] = React.useState(-1);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { selectedRowIds }
  } = useTable(
    {
      columns: preppedColumns,
      data: records,
      defaultColumn: ColumnSizes.MEDIUM
    },
    useRowSelect,
    useFlexLayout,
    (hooks) => {
      hooks.visibleColumns.push((columns) => [
        {
          id: "selection",
          minWidth: 1,
          width: 1,
          maxWidth: 1,
          Header: ({ getToggleAllRowsSelectedProps }) => <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />,
          Cell: ({ row }) => <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
        },
        ...columns.map(generateColumn)
      ]);
    }
  );

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
      {editable &&
        <EditRowForm
          fields={columns}
          id={id}
          prevData={focusedRow !== null ? data[focusedRow] : {}}
          open={modalOpen}
          onSubmit={(editedField) => onEdit(focusedRow, editedField)}
          closeModal={() => toggleModal(false)}
          unfocusRow={() => setFocusedRow(null)}
        />
      }
      <table {...getTableProps()}>
        <thead>
          <tr>
            <th className={"menu-button left"}>
              <div>
                {MenuButtons.Left && <MenuButtons.Left selected={selectedRowIds} openModal={() => toggleModal(true)} />}
              </div>
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
                <th className={column.id} {...column.getHeaderProps()}>
                  {column.render("Header")}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.length === 0 ?
            <tr className={"no-data"}>
              <td>No data to display</td>
            </tr> :
            rows.map((row, index) => {
              prepareRow(row);
              return (
                <Row
                  key={index}
                  data={records}
                  editable={editable}
                  focusRow={focusRow}
                  index={index}
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
      </table>
    </>
  )
};

export default Table;