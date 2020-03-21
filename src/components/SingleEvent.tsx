import { useEffect, useRef, useCallback } from "react";
import { useFirebaseEvents, EventObject } from "./Events";

interface EventComponentProps {
  name: string;
  onEvent: (event: EventObject) => void;
}

const useSingleEvent = ({ name, onEvent }: EventComponentProps) => {
  const startNameRef = useRef(name);
  const { on, fire } = useFirebaseEvents();
  const unlisten = useRef(on(name, onEvent));

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

  return {
    unlisten: unlisten.current,
    fire: fireSingle
  };
};

export { useSingleEvent };
