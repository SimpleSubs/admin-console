import React from "react";
import "../stylesheets/Forms.scss";
import SimpleForm from "./SimpleForm";

const EditRowForm = ({ fields, id, prevData = {}, onSubmit = () => {}, open, closeModal, unfocusRow, custom, extraParams = {}, editing }) => {
  const [state, setState] = React.useState(prevData);
  const openRef = React.useRef(false);

  const cancel = () => {
    closeModal();
    unfocusRow();
  };

  const submit = (state) => {
    onSubmit(state);
    cancel();
  };

  React.useEffect(() => {
    if (!openRef.current) {
      setState(prevData)
    }
    openRef.current = open;
  }, [prevData, open]);

  return (
    <div className={"pop-up-form-background " + (open ? "open" : "closed")} onClick={cancel}>
      <SimpleForm
        className={"edit-row-form"}
        fields={fields}
        id={id}
        prevData={state}
        onSubmit={submit}
        extraParams={extraParams}
        buttonTitles={{ cancel: "Cancel", done: "Done" }}
        onCancel={cancel}
        custom={custom}
      />
    </div>
  );
};

export default EditRowForm;