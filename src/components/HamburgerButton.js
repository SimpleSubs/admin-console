import React from "react";
import "../stylesheets/Hamburger.scss";

const HamburgerMenu = ({ actions, open, setOpen }) => {
  const menuRef = React.useRef();
  useOutsideHandler(menuRef, open, setOpen);
  return (
    <ul className={"hamburger-menu" + (open ? "" : " closed")} ref={(ref) => menuRef.current = ref}>
      {actions.map(({ title, action = () => {} }) => (
        <li key={title}>
          <button onClick={() => {
            action();
            setOpen(false);
          }}>{title}</button>
        </li>
      ))}
    </ul>
  )
};

function useOutsideHandler(ref, open, setOpen) {
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target) && open) {
        setOpen(false);
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, open, setOpen]);
}


const HamburgerButton = ({ actions, selected }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button className={"hamburger-button"} onClick={() => setOpen(true)}>
        <i className="fas fa-ellipsis-v" />
      </button>
      <HamburgerMenu actions={actions(Object.keys(selected).length > 0)} open={open} setOpen={setOpen} />
    </>
  );
};

export default HamburgerButton;