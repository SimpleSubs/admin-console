import React from "react";
import "../stylesheets/Checkbox.css";

const Checkbox = React.forwardRef(({ onClick = () => {}, ...props }, ref) => (
  <label className={"checkbox bounce"}>
    <input type={"checkbox"} onClick={(e) => { e.stopPropagation(); onClick(e) }} {...props} ref={ref} />
    <svg viewBox={"0 0 21 21"}>
      <polyline points={"5 10.75 8.5 14.25 16 6"} />
    </svg>
  </label>
));

export const IndeterminateCheckbox = React.forwardRef(({ indeterminate, ...props }, ref) => {
  const defaultRef = React.useRef();
  const resolvedRef = ref || defaultRef;

  React.useEffect(() => {
    resolvedRef.current.indeterminate = indeterminate;
  }, [resolvedRef, indeterminate]);

  return <Checkbox ref={resolvedRef} {...props} />;
});

export default Checkbox;