import React from "react";
import { toISO } from "../constants/Date";
import "../stylesheets/Orders.css";
import StyledButton from "../components/StyledButton";
import Table from "../components/Table";
import { OrderColumns } from "../constants/TableConstants";
import OrderOptionConstants from "../constants/OrderOptions";
import moment from "moment";
import Loading from "./Loading";
import { connect } from "react-redux";

function tableValues(order, users, orderOptions) {
  if (users[order.uid]) {
    return {
      user: users[order.uid].name || users[order.uid].email,
      date: order.date,
      ingredients: joinIngredients(order, orderOptions)
    }
  } else {
    return null;
  }
}

function joinIngredients({ user, date, uid, ...ingredients }, orderOptions) {
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

function getTableValue(data, key) {
  if (!data[key]) {
    return "";
  } else if (typeof data[key] === "string") {
    return data[key];
  } else {
    return '"' + data[key].join(", ") + '"';
  }
}

function downloadOrders(selected, orders, users, orderOptions, userFields) {
  const orderOptionsWithoutUser = orderOptions.filter(({ key }) => key !== "user");
  const userTitles = userFields.map(({ title }) => title);
  const orderTitles = orderOptionsWithoutUser.map(({ title }) => title);
  let indexesToDownload = Object.keys(selected).map((i) => parseInt(i));
  if (indexesToDownload.length === 0) {
    for (let i = 0; i < orders.length; i++) {
      indexesToDownload.push(i);
    }
  }
  let rows = [[...userTitles, ...orderTitles]];
  for (let i of indexesToDownload) {
    let userData = userFields.map(({ key }) => getTableValue(users[orders[i].uid], key));
    let orderData = orderOptionsWithoutUser.map(({ key }) => getTableValue(orders[i], key));
    rows.push([...userData, ...orderData]);
  }
  let csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  let encodedUri = encodeURI(csvContent);
  let link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `SandwichOrders_${toISO(moment())}.csv`);
  document.body.appendChild(link); // Required for FF
  link.click();
}

const Orders = ({ navbarHeight, orders, orderOptions, users, userFields }) => {
  const data = React.useMemo(
    () => (orders && users && orderOptions) ? orders.map((order) => tableValues(order, users, orderOptions)).filter((order) => !!order) : null,
    [orderOptions, orders, users]
  );
  if (!data) {
    return <Loading />
  }
  const MenuButtons = {
    Right: ({ selected }) => (
      <StyledButton
        title={"Download " + (Object.keys(selected).length === 0 ? "All" : "Selected")}
        icon={"fa-file-download"}
        onClick={() => downloadOrders(selected, orders, users, orderOptions, userFields)}
      />
    )
  }

  return (
    <div id={"Orders"} className={"content-container"} style={{ height: "calc(100vh - " + navbarHeight + "px)" }}>
      <Table data={data} columns={OrderColumns} title={"Orders"} MenuButtons={MenuButtons} />
    </div>
  )
};

const mapStateToProps = ({ orders, appSettings, users }) => ({
  orders,
  orderOptions: appSettings ? [
    ...OrderOptionConstants,
    ...appSettings.orderOptions
  ] : null,
  users,
  userFields: appSettings?.userFields
});

export default connect(mapStateToProps, null)(Orders);