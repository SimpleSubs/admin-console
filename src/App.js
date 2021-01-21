import React from "react";
import "./stylesheets/App.scss";
import { BrowserRouter as Router } from "react-router-dom";
import Navigator from "./navigation/Navigator";
import { createStore } from "redux";
import { Provider } from "react-redux";
import consoleApp from "./redux/Reducers";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Loader from "./components/Loader";

const store = createStore(consoleApp);

const App = () => {
  return (
    <Provider store={store}>
      <DndProvider backend={HTML5Backend}>
        <Router>
          <div id={"App"}>
            <Navigator />
            <Loader />
          </div>
        </Router>
      </DndProvider>
    </Provider>
  );
}

export default App;
