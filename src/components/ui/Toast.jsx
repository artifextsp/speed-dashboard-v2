import { useEffect, useRef } from "react";

export function Toast({ message, isError = false, onClose }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast ${isError ? "toast--error" : "toast--success"}`}>
      {message}
    </div>
  );
}
