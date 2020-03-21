import { useEffect, useRef, useCallback } from "react";
import { useFirebaseEvents, EventObject, UnlistenFunction } from "./Events";

interface EventComponentProps {
  name: string;
  onEvent: (event: EventObject) => void;
}

const useSingleEvent = ({ name, onEvent }: EventComponentProps) => {
  const startNameRef = useRef(name);
  const { on, fire } = useFirebaseEvents();
  const unlisten = useRef<UnlistenFunction>();

  const fireSingle = useCallback(
    (data: { [key: string]: any }) => {
      return fire(name, data);
    },
    [fire, name]
  );

  useEffect(() => {
    if (name !== startNameRef.current) {
      console.warn(
        "Unable to change event name dynamically. Unmount and mount a seperate component"
      );
    }
  }, [name]);

  useEffect(() => {
    unlisten.current = on(name, onEvent);

    return () => unlisten.current();
  }, []);

  return {
    unlisten: unlisten.current,
    fire: fireSingle
  };
};

export { useSingleEvent };
