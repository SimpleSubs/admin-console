import React from "react";
import { toISO } from "../constants/Date";
import "../stylesheets/Orders.css";
import StyledButton from "../components/StyledButton";
import Table from "../components/Table";
import { OrderColumns } from "../constants/TableConstants";
import OrderOptionConstants from "../constants/OrderOptions";
import moment from "moment";
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

function downloadOrders(selected, orders, users, orderOptions) {
  let indexesToDownload = Object.keys(selected).map((i) => parseInt(i));
  if (indexesToDownload.length === 0) {
    for (let i = 0; i < orders.length; i++) {
      indexesToDownload.push(i);
    }
  }
  let rows = [orderOptions.map(({ title }) => title)];
  for (let i of indexesToDownload) {
    rows.push(orderOptions.map(({ key }) => {
      if (key === "user") {
        return users[orders[i].uid].name || users[orders[i].uid].email;
      }
      if (!orders[i][key]) {
        return "";
      } else if (typeof orders[i][key] === "string") {
        return orders[i][key];
      }
      return orders[i][key].join(", ");
    }));
  }
  let csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  let encodedUri = encodeURI(csvContent);
  let link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `SandwichOrders_${toISO(moment())}.csv`);
  document.body.appendChild(link); // Required for FF
  link.click();
}

const Orders = ({ navbarHeight, orders, orderOptions, users }) => {
  const data = React.useMemo(
    () => orders.map((order) => tableValues(order, users, orderOptions)).filter((order) => !!order),
    [orderOptions, orders, users]
  );
  const MenuButtons = {
    Right: ({ selected }) => (
      <StyledButton
        title={"Download " + (Object.keys(selected).length === 0 ? "All" : "Selected")}
        icon={"fa-file-download"}
        onClick={() => downloadOrders(selected, orders, users, orderOptions)}
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
  orderOptions: [
    ...OrderOptionConstants,
    ...appSettings.orderOptions
  ],
  users
});

export default connect(mapStateToProps, null)(Orders);