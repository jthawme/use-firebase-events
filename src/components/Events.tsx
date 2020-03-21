import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect
} from "react";
import firebase from "firebase/app";
import "firebase/database";
import mitt from "mitt";

import { useSingleEvent } from "./SingleEvent";

const DEFAULT_EVENTS_REF = "events";
const DEFAULT_RETRIES = 3;

export enum EventActions {
  Created,
  Updated,
  Deleted
}

export interface EventObject {
  key: string;
  createdAt: number;
  type: string;
  action: EventActions;
  data: {
    [key: string]: any;
  };
}

export type ListenFunction = (event: EventObject) => void;
type UnlistenFunction = () => void;

interface EventsContextProps {
  on: (eventName: string, callback: ListenFunction) => UnlistenFunction;
  fire: (
    eventName: string,
    data: { [key: string]: any },
    retry?: number
  ) => Promise<boolean>;
}

const EventsContext = createContext<EventsContextProps>({
  on: () => () => null,
  fire: () => Promise.resolve(false)
});

interface EventsProviderProps {
  children: React.ReactNode;

  /** Ref name to be stored in Firebase. Default: events */
  eventsRefName?: string;

  /** Whether to skip initial child_added events */
  startFromLast?: boolean;

  /** Amount of times to try and send data before failing */
  fireRetries?: number;

  /** firebase config object */
  config: {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId: string;
    appId: string;
  };
}

const mittRef = mitt();

const EventsProvider = ({
  children,
  config,
  eventsRefName = DEFAULT_EVENTS_REF,
  startFromLast = true,
  fireRetries = DEFAULT_RETRIES
}: EventsProviderProps) => {
  const firebaseRef = useRef<firebase.app.App>();
  const databaseRef = useRef<firebase.database.Database>();
  const eventsDatabaseRef = useRef<firebase.database.Query>();

  const on = useCallback<EventsContextProps["on"]>((eventName, callback) => {
    mittRef.current.on(eventName, callback);

    return () => mittRef.current.off(eventName, callback);
  }, []);

  const fire = useCallback<EventsContextProps["fire"]>(
    (eventName, data, retry = 0) => {
      if (databaseRef.current) {
        const keyRef = databaseRef.current.ref(eventsRefName).push();

        return keyRef
          .set({
            type: eventName,
            createdAt: new Date().getTime(),
            data
          })
          .then(() => true);
      } else {
        if (retry > fireRetries) {
          return Promise.reject("Unable to connect to firebase events ref");
        } else {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(fire(eventName, data, retry + 1));
            }, 100);
          });
        }
      }
    },
    []
  );

  const getCurrent = useCallback(async () => {
    if (startFromLast) {
      const lastEventKey = await databaseRef.current
        .ref(`${eventsRefName}`)
        .orderByChild("createdAt")
        .limitToLast(1)
        .once("value")
        .then(snapshot => {
          const val = snapshot.val();
          const lastKey = Object.keys(val || {}).pop();
          return val && lastKey ? val[lastKey].createdAt : 0;
        });

      return databaseRef.current
        .ref(eventsRefName)
        .orderByChild("createdAt")
        .startAt(lastEventKey + 1);
    } else {
      return databaseRef.current.ref(eventsRefName);
    }
  }, [eventsRefName, startFromLast]);

  const setupGenericListeners = useCallback(
    (dbRef: firebase.database.Query) => {
      const fireFunc = (
        key: string | null,
        data: any,
        action: EventActions
      ) => {
        if (key) {
          const obj: EventObject = {
            key,
            type: data.type,
            createdAt: data.createdAt,
            data: data,
            action
          };

          mittRef.current.emit(data.type, obj);
        }
      };

      dbRef.on("child_added", snapshot => {
        fireFunc(snapshot.key, snapshot.val(), EventActions.Created);
      });

      dbRef.on("child_changed", snapshot => {
        fireFunc(snapshot.key, snapshot.val(), EventActions.Updated);
      });

      dbRef.on("child_removed", snapshot => {
        fireFunc(snapshot.key, snapshot.val(), EventActions.Deleted);
      });
    },
    []
  );

  useEffect(() => {
    firebaseRef.current = firebase.initializeApp(config);
    databaseRef.current = firebase.database();

    const setupDBListener = async () => {
      const dbRef = await getCurrent();

      eventsDatabaseRef.current = dbRef;

      setupGenericListeners(eventsDatabaseRef.current);
    };

    setupDBListener();

    return () => eventsDatabaseRef.current?.off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const values = {
    on,
    fire
  };

  return (
    <EventsContext.Provider value={values}>{children}</EventsContext.Provider>
  );
};

const useFirebaseEvents = () => useContext(EventsContext);

export { EventsProvider, useFirebaseEvents, useSingleEvent };
