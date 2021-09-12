import React from "react";
import Table from "../components/Table";
import HamburgerButton from "../components/HamburgerButton";
import { connect } from "react-redux";
import { deleteUsers, resetPasswords, updateUser, importUsers } from "../redux/Actions";
import Loading from "./Loading";
import { UserColumns } from "../constants/TableConstants";
import { getTableValue, download } from "../constants/TableActions";
import FileModal from "../components/FileModal";

function downloadUsers(selected, users, userFields) {
  const userTitles = userFields.map(({ title }) => title);
  let usersToDownload;
  // Download all selected orders
  if (Object.keys(selected).length > 0) {
    usersToDownload = users.filter((user, i) => selected[i]);
    // Download today's orders if nothing is selected
  } else {
    usersToDownload = [...users];
  }
  let rows = [userTitles];
  for (let user of usersToDownload) {
    let userData = userFields.map(({ key }) => getTableValue(user, key));
    rows.push(userData);
  }
  download(rows, "simple_subs_users");
}

function transformHeader(header, userFields) {
  let potentialKeys = userFields.filter(({ title }) => title.trim().toLowerCase() === header.trim().toLowerCase());
  if (potentialKeys.length === 0) {
    return header;
  } else {
    return potentialKeys[0].key;
  }
}

const Users = ({ navbarHeight, users, userFields, user, deleteUsers, resetPasswords, updateUser, importUsers, domain }) => {
  const [fileModalOpen, setFileModal] = React.useState(false);
  const userData = React.useMemo(
    () => (users && userFields) ? Object.keys(users).map((uid) => ({ ...users[uid], uid })) : null,
    [userFields, users]
  );
  const columns = React.useMemo(
    () => userFields ? userFields.map((field) => ({...field, type: field.inputType})) : null,
    [userFields]
  );

  if (!userData) {
    return <Loading />
  }
  const deleteSelected = (selected) => {
    deleteUsers(Object.keys(selected).map((index) => userData[index].uid), user.uid, domain);
  };
  const resetSelected = (selected) => {
    resetPasswords(Object.keys(selected).map((index) => userData[index].uid), domain);
  }
  const MenuButtons = {
    Right: ({ selected, setCarefulSubmit }) => (
      <HamburgerButton
        selected={selected}
        actions={(anySelected = false) => {
          let actions = [
            {
              title: `Reset ${anySelected ? "selected" : "all"} passwords`,
              action: () => setCarefulSubmit(() => resetSelected(selected))
            },
            {
              title: `Download ${anySelected ? "selected" : "all"} users`,
              action: () => downloadUsers(selected, userData, userFields)
            },
            {
              title: "Import users",
              action: () => setFileModal(true)
            },
          ];
          if (anySelected) {
            actions.push({
              title: "Delete selected users",
              action: () => setCarefulSubmit(() => deleteSelected(selected))
            });
          }
          return actions;
        }}
      />
    )
  };

  const editUser = (index, editedUser) => {
    let newData = { ...editedUser };
    delete newData.key;
    delete newData.uid;
    updateUser(editedUser.uid, editedUser, users[editedUser.uid], domain);
  }

  return (
    <div id={"Users"} className={"content-container"} style={{ height: "calc(100vh - " + navbarHeight + "px)" }}>
      <FileModal
        open={fileModalOpen}
        closeModal={() => setFileModal(false)}
        transformHeader={(header) => transformHeader(header, userFields)}
        onSubmit={(data) => importUsers(data, domain)}
      />
      <Table
        data={userData}
        columns={columns}
        title={"Users"}
        MenuButtons={MenuButtons}
        extraParams={{ user }}
        onEdit={editUser}
        extraFields={[{ key: "uid" }]}
        defaultSortCol={"grade"}
      />
    </div>
  );
};

const mapStateToProps = ({ users, appSettings, user, domain }) => ({
  users,
  userFields: appSettings?.userFields ? [UserColumns[0], ...appSettings.userFields, UserColumns[1]] : null,
  user,
  domain: domain.id
});

const mapDispatchToProps = (dispatch) => ({
  deleteUsers: (selected, uid, domain) => deleteUsers(selected, uid, dispatch, domain),
  resetPasswords: (uids, domain) => resetPasswords(uids, dispatch, domain),
  updateUser: (uid, userData, prevData, domain) => updateUser(uid, userData, prevData, dispatch, domain),
  importUsers: (data, domain) => importUsers(data, dispatch, domain)
})

export default connect(mapStateToProps, mapDispatchToProps)(Users);