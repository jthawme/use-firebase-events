# useFirebaseEvents

Designed to help you get up and running with an event like system connected through the marvellous [Firebase](https://firebase.google.com/)

## Install

```bash
npm i use-firebase-events
```

## Usage

First, wrap your app with the `<EventsProvider/>`

**index.tsx**

```js
import React from "react";
import ReactDOM from "react-dom";
import { EventsProvider } from "use-firebase-events";
import App from "./App";

const firebaseConfig = {
  ...config from firebase
};

ReactDOM.render(
  <EventsProvider config={firebaseConfig}>
    <App />
  </EventsProvider>,
  document.getElementById("root")
);
```

**App.tsx**

```js
import React, { useCallback, useEffect } from "react";
import { useSingleEvent } from "use-firebase-events";

const EVENTS = {
  TEST: "TEST"
};

function App() {
  const onEvent = useCallback(event => {
    console.log("event", event);
  }, []);

  const { unlisten, fire } = useSingleEvent({
    name: EVENTS.TEST,
    onEvent
  });

  useEffect(() => {
    return () => unlisten();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
      <button onClick={() => fire({ foo: "bar" })}>Fire event</button>
    </div>
  );
}

export default App;
```

### API

`<EventsProvider/>`

**Required props are marked with `*`.**

| Name          | Type    | Default | Description                                             |
| ------------- | ------- | ------- | ------------------------------------------------------- |
| config\*      | object  |         | The firebase config object for your database            |
| eventsRefName | string  | events  | The ref name to be used in your database                |
| startFromLast | boolean | true    | Whether to not fire events for previously stored events |
| fireRetries   | number  | 3       | How many times to fire event before failing             |

`useFirebaseEvents()`

**Options (required `*`)**

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |


**Returns**

```js
{
  on: (eventName: string, callback: ListenFunction) => UnlistenFunction,
  fire: (
    eventName: string,
    data: { [key: string]: any }
  ) => Promise<boolean>;
}
```

`useFirebaseEvents()`

**Options (required `*`)**

| Name      | Type                         | Default | Description                              |
| --------- | ---------------------------- | ------- | ---------------------------------------- |
| name\*    | string                       |         | The event name                           |
| onEvent\* | (event: EventObject) => void |         | The callback for when the event is fired |

**Returns**

```js
{
  unlisten: () => void,
  fireSingle: (
    data: { [key: string]: any }
  ) => Promise<boolean>;
}
```
