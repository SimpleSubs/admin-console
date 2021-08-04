import React from "react";
import CSVReader from "react-csv-reader";

const FileModal = ({ open, closeModal, onSubmit, transformHeader = (header) => header }) => {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(false);

  const cancel = () => {
    setError(false);
    setData(null);
    closeModal();
  }

  const submit = (e) => {
    e.preventDefault();
    if (!data) {
      setError(true);
      return;
    }
    onSubmit(data);
    cancel();
  }

  return (
    <div className={"pop-up-form-background " + (open ? "open" : "closed")} onClick={cancel}>
      <form
        className={"simple-form file-form"}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <CSVReader
          parserOptions={{ header: true, transformHeader }}
          onFileLoaded={(data) => setData(data)}
          onError={() => setError(true)}
        />
        <div className={"footer"}>
          <p className={"error " + (error ? "shown" : "hidden")}>Please select a valid .csv file</p>
          <div className={"buttons"}>
            <input
              className={"styled-button cancel"}
              type={"button"}
              value={"Cancel"}
              onClick={cancel}
            />
            <input className={"styled-button"} type={"submit"} value={"Import"} />
          </div>
        </div>
      </form>
    </div>
  );
}

export default FileModal;