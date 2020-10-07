import React from "react";
import Table from "../components/Table";
import HamburgerButton from "../components/HamburgerButton";
import { connect } from "react-redux";
import { deleteUsers } from "../redux/Actions";

const Users = ({ navbarHeight, users, userFields, uid, deleteUsers, emailUsers }) => {
  const userData = React.useMemo(() => Object.keys(users).map((uid) => ({...users[uid], uid})), [users]);
  const deleteSelected = (selected) => {
    deleteUsers(Object.keys(selected).map((index) => userData[index].uid), uid);
  };
  const MenuButtons = {
    Right: ({ selected }) => (
      <HamburgerButton
        selected={selected}
        actions={(anySelected = false) => [
          { title: `Delete ${anySelected ? "selected" : "all"} users`, action: () => deleteSelected(selected) },
          // { title: `Email ${anySelected ? "selected" : "all"} users`, action: () => emailUsers(selected) }
        ]}
      />
    )
  };

  return (
    <div id={"Users"} className={"content-container"} style={{ height: "calc(100vh - " + navbarHeight + "px)" }}>
      <Table data={userData} columns={userFields} title={"Users"} MenuButtons={MenuButtons}/>
    </div>
  )
};

const mapStateToProps = ({ users, appSettings, user }) => ({
  users,
  userFields: [
    { key: "email", title: "Email" },
    ...(appSettings.userFields)
  ],
  uid: user ? user.uid : null
})

const mapDispatchToProps = (dispatch) => ({
  deleteUsers: (selected, uid) => deleteUsers(selected, uid, dispatch),
  emailUsers: () => {}
})

export default connect(mapStateToProps, mapDispatchToProps)(Users);