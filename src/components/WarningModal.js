import React from "react";
import "../stylesheets/WarningModal.scss";

const WarningModal = ({ open, onSubmit, closeModal }) => (
  <div className={"pop-up-form-background " + (!open ? "closed" : "")} onClick={closeModal}>
    <form className={"warning-modal"} onSubmit={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onSubmit(e);
      closeModal();
    }}>
      <h3>Are you sure?</h3>
      <p>This action cannot be undone.</p>
      <div>
        <input type={"button"} value={"Cancel"} className={"styled-button"} onClick={closeModal} />
        <input type={"submit"} value={"Continue"} className={"styled-button"} onClick={(e) => e.stopPropagation()} />
      </div>
    </form>
  </div>
);

export default WarningModal