import React from "react";
import { toISO, parseISO } from "../constants/Date";
import "../stylesheets/Orders.css";
import Table from "../components/Table";
import { OrderColumns } from "../constants/TableConstants";
import { TableTypes } from "../constants/TableActions";
import moment from "moment";
import Loading from "./Loading";
import { connect } from "react-redux";
import { deleteOrders, updateOrder } from "../redux/Actions";
import HamburgerButton from "../components/HamburgerButton";
import WarningModal from "../components/WarningModal";

function tableValues(order, users) {
  if (users[order.uid]) {
    return {
      ...order,
      user: users[order.uid].name || users[order.uid].email
    };
  } else {
    return null;
  }
}

function joinIngredients(ingredients, orderOptions) {
  return orderOptions.map(({ key }) => ingredients[key]).reduce((combined, current) => {
    if (!current) return combined;
    let combinedArr = combined;
    if (!combined) {
      combinedArr = [];
    } else if (typeof combined === "string") {
      combinedArr = [combined];
    }
    return (
      typeof current === "string" ?
        [...combinedArr, current] :
        combinedArr.concat(current)
    )
  });
}

function getTableValue(data = {}, key) {
  if (!data[key]) {
    return "";
  } else if (typeof data[key] === "string") {
    return '"' + data[key] + '"';
  } else {
    return '"' + data[key].join(", ") + '"';
  }
}

function getCounts(orders, orderOptions) {
  const orderOptionsWithoutDate = orderOptions.filter(({ key }) => key !== "date");
  let counts = [[]];
  for (let option of orderOptionsWithoutDate) {
    if (option.type === "CHECKBOX" || option.type === "PICKER") {
      counts.push([option.title]);
      for (let ingredient of option.options) {
        let row = [ingredient];
        if (option.type === "PICKER") {
          row.push(orders.filter((order) => order[option.key] === ingredient).length);
        } else {
          row.push(orders.filter((order) => order[option.key]?.includes(ingredient)).length);
        }
        counts.push(row);
      }
    }
  }
  return counts;
}

function downloadOrders(selected, orders, users, orderOptions, userFields) {
  const orderOptionsWithoutUser = orderOptions.filter(({ key }) => key !== "user");
  const userTitles = userFields.map(({ title }) => title);
  const orderTitles = orderOptionsWithoutUser.map(({ title }) => title);
  let ordersToDownload;
  // Download all selected orders
  if (Object.keys(selected).length > 0) {
    ordersToDownload = orders.filter((order, i) => selected[i]);
  // Download today's orders if nothing is selected
  } else {
    let now = moment();
    ordersToDownload = orders.filter(({ date }) => now.isSame(parseISO(date), "day"));
  }
  let rows = [[...userTitles, ...orderTitles]];
  for (let order of ordersToDownload) {
    let userData = userFields.map(({ key }) => getTableValue(users[order.uid], key));
    let orderData = orderOptionsWithoutUser.map(({ key }) => getTableValue(order, key));
    rows.push([...userData, ...orderData]);
  }
  rows = [...rows, ...getCounts(ordersToDownload, orderOptionsWithoutUser)];
  let csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  let encodedUri = encodeURI(csvContent);
  let link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `SandwichOrders_${toISO(moment())}.csv`);
  document.body.appendChild(link); // Required for FF
  link.click();
}

const Orders = ({ navbarHeight, orders, orderOptions, users, userFields, updateOrder, deleteOrders }) => {
  const data = React.useMemo(
    () => (
      (orders && users && orderOptions)
        ? orders.map((order) => tableValues(order, users)).filter((order) => !!order)
        : null
    ),
    [orderOptions, orders, users]
  );
  const [warningOpen, setWarningOpen] = React.useState(false);
  const [selected, setSelected] = React.useState({});

  if (!data) {
    return <Loading />
  }

  const deleteSelected = () => {
    deleteOrders(Object.keys(selected).map((index) => data[index].key));
  }

  const MenuButtons = {
    Right: ({ selected }) => (
      <HamburgerButton
        selected={selected}
        actions={(anySelected = false) => {
          let actions = [
            { title: `Download ${anySelected ? "selected" : "today's"} orders`, action: () => downloadOrders(selected, data, users, orderOptions, userFields) },
          ];
          if (anySelected) {
            actions.push({
              title: "Delete selected orders",
              action: () => {
                setSelected(selected);
                setWarningOpen(true);
              }
            });
          }
          return actions;
        }}
      />
    )
  };

  const getDataValues = (orders) => (
    orders.map(({ user, date, uid, key, ...ingredients }) => ({
      user,
      date,
      ingredients: joinIngredients(ingredients, orderOptions)
    }))
  );

  const getColumnValues = () => [
    ...OrderColumns,
    { key: "ingredients", title: "Ingredients", type: TableTypes.ARRAY, size: "LARGE" }
  ];

  const editOrder = (index, editedOrder) => {
    let key = editedOrder.key;
    let fixedOrder = {...editedOrder};
    delete fixedOrder.user;
    delete fixedOrder.key;
    updateOrder(key, fixedOrder);
  }

  return (
    <div id={"Orders"} className={"content-container"} style={{ height: "calc(100vh - " + navbarHeight + "px)" }}>
      <WarningModal closeModal={() => setWarningOpen(false)} onSubmit={deleteSelected} open={warningOpen} />
      <Table
        data={data}
        columns={orderOptions}
        title={"Orders"}
        MenuButtons={MenuButtons}
        getDataValues={getDataValues}
        getColumnValues={getColumnValues}
        onEdit={editOrder}
        extraFields={[{ key: "uid" }]}
        defaultSortCol={"date"}
      />
    </div>
  )
};

const mapStateToProps = ({ orders, appSettings, users }) => ({
  orders,
  orderOptions: appSettings ? [
    ...OrderColumns,
    ...appSettings.orderOptions
  ] : null,
  users,
  userFields: appSettings?.userFields
});

const mapDispatchToProps = (dispatch) => ({
  updateOrder: (id, order) => updateOrder(id, order, dispatch),
  deleteOrders: (orders) => deleteOrders(orders, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(Orders);