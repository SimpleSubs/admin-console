import StyledButton from "./StyledButton";
import Checkbox from "./Checkbox";
import HamburgerButton from "./HamburgerButton";
import Table from "./Table";
import { OrderOptionColumns } from "../constants/TableConstants";
import React from "react";
import {parseISO, SIMPLE_FORMAT, toSimple} from "../constants/Date";
import EditRowForm from "./EditRowForm";
import {TableTypes} from "../constants/TableActions";

const MenuButtons = (isTopLevel, deleteOrderOptions, deleteMenu, toggleCheckbox) => ({
  Left: ({ openModal }) => <StyledButton title={"Create"} icon={"fa-plus"} onClick={openModal} />,
  Right: ({ selected, setCarefulSubmit }) => (
    <div className={"hamburger-container"}>
      {isTopLevel && <div className={"checkbox-container"}>
        <p>Dynamic menus enabled</p>
        <Checkbox checked={false} onChange={toggleCheckbox} />
      </div>}
      <HamburgerButton
        selected={selected}
        actions={(anySelected) => {
          const options = [{
            title: `Delete ${anySelected ? "selected" : "all"} order fields`,
            action: () => setCarefulSubmit(() => deleteOrderOptions(selected))
          }];
          if (!isTopLevel) {
            options.push({
              title: "Delete this menu",
              action: () => setCarefulSubmit(deleteMenu)
            });
          }
          return options;
        }}
      />
    </div>
  )
});

const OrderOptionsTable = ({ id, title, orderOptions = [], setOrderOptions, isTopLevel, deleteMenu, toggleCheckbox }) => {
  const editOrderOption = (index, editedOption) => {
    let newOptions = [...orderOptions];
    if (index !== null) {
      newOptions[index] = editedOption;
    } else {
      newOptions.push(editedOption);
    }
    setOrderOptions(newOptions);
  };

  const deleteOrderOptions = (selected) => {
    let newOptions = Object.keys(selected).length > 0 ?
      orderOptions.filter((option, index) => !selected[index]) :
      [];
    setOrderOptions(newOptions);
  }

  return (
    <Table
      id={id}
      custom
      data={orderOptions}
      columns={OrderOptionColumns}
      title={title}
      MenuButtons={MenuButtons(isTopLevel, deleteOrderOptions, deleteMenu, toggleCheckbox)}
      onEdit={editOrderOption}
      pushState={(newState) => setOrderOptions(newState)}
    />
  );
};

const OrderOptionsHeader = ({ addMenu, dynamic, toggleDynamic }) => {
  const [modalOpen, toggleModal] = React.useState(false);
  const MenuButtons = ({
    Left: () => <StyledButton title={"Add menu"} icon={"fa-plus"} onClick={() => toggleModal(true)} />,
    Right: () => (
      <div className={"hamburger-container"}>
        <div className={"checkbox-container"}>
          <p>Dynamic menus enabled</p>
          <Checkbox checked={dynamic} onChange={toggleDynamic} />
        </div>
      </div>
    )
  });
  return (
    <div className={"header"}>
      <EditRowForm
        fields={[{ key: "active", title: "Date", type: TableTypes.DATE, required: true }]}
        open={modalOpen}
        prevData={{}}
        onSubmit={(editedField) => addMenu(editedField.active)}
        closeModal={() => toggleModal(false)}
        unfocusRow={() => {}}
        custom
      />
      <div className={"button"}>
        <MenuButtons.Left />
      </div>
      <h3>Order Options</h3>
      <div className={"button"}>
        <MenuButtons.Right />
      </div>
    </div>
  )
};

const OrderOptions = ({ orderOptions, menus = [], setOrderOptions, addMenu, deleteMenu, editMenu }) => {
  if (!orderOptions.dynamic) {
    return (
      <OrderOptionsTable
        title={"Order Options"}
        id={"order-options-table"}
        orderOptions={orderOptions.orderOptions}
        setOrderOptions={(data) => setOrderOptions({ orderOptions: data })}
        isTopLevel
        toggleCheckbox={() => setOrderOptions({ dynamic: !orderOptions.dynamic })}
      />
    );
  } else {
    return (
      <div className={"setting-form order-options-form"}>
        <OrderOptionsHeader
          addMenu={addMenu}
          dynamic={orderOptions.dynamic}
          toggleDynamic={() => setOrderOptions({ dynamic: !orderOptions.dynamic })}
        />
        {(menus || []).map((menu) => (
          <OrderOptionsTable
            id={menu.key + "-table"}
            key={menu.key}
            title={`${toSimple(menu.active)} to ${parseISO(menu.active).day(6).format(SIMPLE_FORMAT)}`}
            orderOptions={menu.orderOptions}
            deleteMenu={() => deleteMenu(menu.key)}
            setOrderOptions={(data) => editMenu(menu.key, { orderOptions: data })}
          />
        ))}
      </div>
    )
  }
}

export default OrderOptions;