import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import "./css/app.css";
import { Index } from "./Index";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact component={Index} />
      </Switch>
    </Router>
  );
}

export default App;
