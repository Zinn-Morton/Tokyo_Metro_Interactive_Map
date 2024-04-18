import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import "./app.css";
import Index from "./index.jsx";

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
