import React from "react";
import {toISO, parseISO, ISO_FORMAT} from "../constants/Date";
import "../stylesheets/Orders.scss";
import Table from "../components/Table";
import { OrderColumns } from "../constants/TableConstants";
import { TableTypes, getTableValue, download } from "../constants/TableActions";
import moment from "moment";
import Loading from "./Loading";
import { connect } from "react-redux";
import { deleteOrders, updateOrder } from "../redux/Actions";
import HamburgerButton from "../components/HamburgerButton";

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

function getDynamicOptions(date, dynamic, orderOptions, menus) {
  return dynamic ?
    menus.find(({ active }) => parseISO(date).isSame(active, "week")).orderOptions :
    orderOptions;
}

function joinIngredients(ingredients, orderOptions, dynamic, date, menus) {
  const dynamicOptions = getDynamicOptions(date, dynamic, orderOptions, menus);
  return dynamicOptions.map(({ key }) => ingredients[key]).reduce((combined, current) => {
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

function getRelevantMenus(menus, orders) {
  const sundays = [];
  orders.forEach(({ date }) => {
    const sunday = parseISO(date).day(0).format(ISO_FORMAT);
    if (!sundays.includes(sunday)) {
      sundays.push(sunday);
    }
  });
  return [
    ...OrderColumns,
    ...menus
      .filter(({ active }) => sundays.includes(active))
      .map(({ orderOptions }) => orderOptions)
      .reduce((accumulator, currentValue) => [...accumulator, ...currentValue], [])
  ];
}

function downloadOrders(selected, orders, users, orderOptions, userFields, dynamic, menus) {
  let ordersToDownload;
  // Download all selected orders
  if (Object.keys(selected).length > 0) {
    ordersToDownload = orders.filter((order, i) => selected[i]);
  // Download today's orders if nothing is selected
  } else {
    let now = moment();
    ordersToDownload = orders.filter(({ date }) => now.isSame(parseISO(date), "day"));
  }
  let orderColumns = orderOptions;
  if (dynamic) {
    orderColumns = getRelevantMenus(menus, ordersToDownload);
  }
  const orderOptionsWithoutUser = orderColumns.filter(({ key }) => key !== "user");
  const userTitles = userFields.map(({ title }) => title);
  const orderTitles = orderOptionsWithoutUser.map(({ title }) => title);
  let rows = [[...userTitles, ...orderTitles]];
  for (let order of ordersToDownload) {
    let userData = userFields.map(({ key }) => getTableValue(users[order.uid], key));
    let orderData = orderOptionsWithoutUser.map(({ key }) => getTableValue(order, key));
    rows.push([...userData, ...orderData]);
  }
  rows = [...rows, ...getCounts(ordersToDownload, orderOptionsWithoutUser)];
  download(rows, `simple_subs_orders_${toISO(moment())}`);
}

const Orders = ({ navbarHeight, orders, orderOptions, dynamicMenus, menus, users, userFields, updateOrder, deleteOrders, domain }) => {
  const data = React.useMemo(
    () => (
      (orders && users && (orderOptions?.dynamic ? menus : orderOptions))
        ? orders.map((order) => tableValues(order, users)).filter((order) => !!order)
        : null
    ),
    [orderOptions, orders, users, menus]
  );

  if (!data) {
    return <Loading />
  }

  const deleteSelected = (selected) => {
    deleteOrders(Object.keys(selected).map((index) => data[index].key), domain);
  }

  const MenuButtons = {
    Right: ({ selected, setCarefulSubmit }) => (
      <HamburgerButton
        selected={selected}
        actions={(anySelected = false) => {
          let actions = [
            {
              title: `Download ${anySelected ? "selected" : "today's"} orders`,
              action: () => downloadOrders(selected, data, users, orderOptions, userFields, dynamicMenus, menus) },
          ];
          if (anySelected) {
            actions.push({
              title: "Delete selected orders",
              action: () => setCarefulSubmit(() => deleteSelected(selected))
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
      ingredients: joinIngredients(ingredients, orderOptions, dynamicMenus, date, menus)
    }))
  );

  const getColumnValues = () => [
    ...OrderColumns,
    { key: "ingredients", title: "Ingredients", type: TableTypes.TEXT, size: "LARGE" }
  ];

  const editOrder = (index, editedOrder) => {
    let key = editedOrder.key;
    let fixedOrder = {...editedOrder};
    delete fixedOrder.user;
    delete fixedOrder.key;
    updateOrder(key, fixedOrder, domain);
  }

  return (
    <div id={"Orders"} className={"content-container"} style={{ height: "calc(100vh - " + navbarHeight + "px)" }}>
      <Table
        data={data}
        columns={dynamicMenus ? getRelevantMenus(menus, orders) : orderOptions}
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

const mapStateToProps = ({ orders, appSettings, menus, users, domain }) => ({
  orders,
  orderOptions: appSettings ? [
    ...OrderColumns,
    ...(appSettings.orderOptions?.orderOptions || [])
  ] : null,
  dynamicMenus: !!appSettings?.orderOptions?.dynamic,
  menus: menus,
  users,
  domain: domain.id,
  userFields: appSettings?.userFields
});

const mapDispatchToProps = (dispatch) => ({
  updateOrder: (id, order, domain) => updateOrder(id, order, dispatch, domain),
  deleteOrders: (orders, domain) => deleteOrders(orders, dispatch, domain)
})

export default connect(mapStateToProps, mapDispatchToProps)(Orders);