import { useState, useEffect, useRef, useLayoutEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

import "./index.css";

const url = "http://localhost:5000";
// const url = "https://task-manager-self.fly.dev";

function Index() {
    // List of tasks
    const [tasks, setTasks] = useState([]);

    // Errors for fetching and creating a task
    const [fetch_error, setFetchError] = useState(false);
    const [create_error, setCreateError] = useState(false);

    // Logged in user information
    const [is_logged_in, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");

    // Create task input and submit reference
    const input_ref = useRef(null);
    const submit_ref = useRef(null);

    useEffect(() => {
        // Check token to see if we are logged in
        if (localStorage.getItem("token") === null) {
            setIsLoggedIn(false);
        } else {
            setIsLoggedIn(true);
            setUsername(jwtDecode(localStorage.getItem("token")).username);
        }

        // Get all tasks for the user
        fetchTasks();

        // Match the height of the submit button to the height of the input next to it and add a listener to do this automatically
        resizeSubmit();
        window.addEventListener("resize", resizeSubmit);

        // Cleanup function
        return () => {
            window.removeEventListener("resize", resizeSubmit);
        };
    }, []);

    // Log into account. If successful, set localStorage item token to the response token to log in. Set username by decoding token
    async function login(login_username, login_password) {
        try {
            const response = await axios.post(`${url}/api/v1/tasks/login`, { username: login_username, password: login_password });
            localStorage.setItem("token", response.data.token);
            setIsLoggedIn(true);
            setUsername(jwtDecode(localStorage.getItem("token")).username);
            await fetchTasks();
        } catch (err) {
            throw err;
        }
    }

    // Log out of account and clear token
    function logout() {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setUsername("");
        fetchTasks();
    }

    // Create new account and set token and username. Returns true on success and false otherwise
    async function createAccount(signup_username, signup_password) {
        try {
            const response = await axios.post(`${url}/api/v1/tasks/signup`, { username: signup_username, password: signup_password });
            localStorage.setItem("token", response.data.token);
            setIsLoggedIn(true);
            setUsername(jwtDecode(localStorage.getItem("token")).username);
            fetchTasks();
            return true;
        } catch (err) {
            throw err;
        }
    }

    // Handles enter to submit create task
    function handleKeyDown(e) {
        if (e.key === "Enter") {
            createTask();
        }
    }

    // Resizes the submit button to match the height of the input next to it
    function resizeSubmit() {
        if (submit_ref.current && input_ref.current) {
            submit_ref.current.style.height = input_ref.current.style.height;
        }
    }

    // Gets all the user's tasks
    async function fetchTasks() {
        const token = localStorage.getItem("token");

        if (!token) {
            setFetchError("Please log in to access tasks");
        } else {
            try {
                const response = await axios.get(`${url}/api/v1/tasks`, { headers: { authorization: `Bearer ${token}` } });
                setFetchError("");
                setTasks(response.data);
            } catch (err) {
                setFetchError("Error finding tasks");
            }
        }
    }

    // Creates a task for the user
    async function createTask() {
        const token = localStorage.getItem("token");

        if (!token) {
            setCreateError("Please log in to create tasks");
        } else {
            try {
                const response = await axios.post(`${url}/api/v1/tasks`, { name: input_ref.current.value }, { headers: { authorization: `Bearer ${token}` } });
                await fetchTasks();
                input_ref.current.value = "";
                setCreateError("");
            } catch (err) {
                setCreateError("Error creating task. Try logging back in or try later");
            }
        }
    }

    // Injects the tasks into html
    const task_list_inject = tasks.map((task) => {
        return <Task id={task._id} name={task.name} completed={task.completed} fetchTasks={fetchTasks} />;
    });

    return (
        <>
            {/* Login nav */}
            <LoginNav is_logged_in={is_logged_in} username={username} login={login} logout={logout} createAccount={createAccount}></LoginNav>
            {/* Title */}
            <h1 className="title">Task Manager</h1>
            {/* Add task */}
            <div className="add-task">
                <h2>Add Task</h2>
                <div>
                    <TextareaAutosize name="new-task" id="new-task-name" onKeyDown={(e) => handleKeyDown(e)} onHeightChange={() => resizeSubmit()} ref={input_ref} maxLength="100" minRows="3"></TextareaAutosize>
                    <button onClick={() => createTask()} ref={submit_ref}>
                        Submit
                    </button>
                </div>
                {create_error ? (
                    <div className="error-text-div">
                        <h2 className="error-text">{create_error}</h2>
                    </div>
                ) : null}
            </div>
            {/* Fetched tasks */}
            {fetch_error ? <h2 className="error-text">{fetch_error}</h2> : <ul className="task-list">{task_list_inject}</ul>}
        </>
    );
}

function LoginNav({ is_logged_in, username, login, logout, createAccount }) {
    // Login form dropdown toggle and input states
    const [is_login_dropdown, setIsLoginDropdown] = useState(false);
    const [login_username, setLoginUsername] = useState("");
    const [login_password, setLoginPassword] = useState("");
    const [login_error, setLoginError] = useState(false);

    // Signup form dropdown toggle and input states
    const [is_signup_dropdown, setIsSignupDropdown] = useState(false);
    const [signup_username, setSignupUsername] = useState("");
    const [signup_password, setSignupPassword] = useState("");
    const [signup_error, setSignupError] = useState(false);

    // References to dropdown toggles and dropdowns
    const login_dropdown_button_ref = useRef(null);
    const login_dropdown_ref = useRef(null);

    const signup_dropdown_button_ref = useRef(null);
    const signup_dropdown_ref = useRef(null);

    // Close login and signup dropdowns when clicking somewhere else
    useClickOutside([login_dropdown_button_ref, login_dropdown_ref], () => {
        setIsLoginDropdown(false);
    });

    useClickOutside([signup_dropdown_button_ref, signup_dropdown_ref], () => {
        setIsSignupDropdown(false);
        setSignupError(false);
    });

    // Handles enter to login / signup
    function handleKeyDown(e, fn, arg1, arg2) {
        if (e.key === "Enter") {
            fn(arg1, arg2);
        }
    }

    // Wrapper function for login function passed in from parents.
    async function callLogin(login_username, login_password) {
        try {
            await login(login_username, login_password);
            setLoginError("");
            setLoginUsername("");
            setLoginPassword("");
            setSignupUsername("");
            setSignupPassword("");
        } catch (err) {
            if (err.response.status == 401) {
                setLoginError(err.response.data.message);
            } else {
                setLoginError("Error logging in");
            }
        }
    }

    // Wrapper function for the create account function passed in from parent. Clears some inputs too
    async function callCreateAccount(signup_username, signup_password) {
        try {
            await createAccount(signup_username, signup_password);
            setSignupError(false);
            setSignupUsername("");
            setSignupPassword("");
            setLoginUsername("");
            setLoginPassword("");
        } catch (err) {
            setSignupError(true);
        }
    }

    return (
        <nav className="nav-bar">
            <a href="https://github.com/ZinnMortonOSU/Task-Manager-Website">Project Github Repo</a>
            {is_logged_in ? (
                <>
                    {/* If logged in show username and logout */}
                    <h1>Hello, {username}</h1>
                    <button onClick={() => logout()}>Log out</button>
                </>
            ) : (
                <>
                    {/* If not logged in show login and signup */}
                    {/* Login dropdown toggle button */}
                    <button className="toggle-dropdown" ref={login_dropdown_button_ref} onClick={() => setIsLoginDropdown(!is_login_dropdown)}>
                        Log in<span className="arrow">{is_login_dropdown ? "\u25B2" : "\u25BC"}</span>
                    </button>
                    {/* Signup dropdown toggle button */}
                    <button className="toggle-dropdown" ref={signup_dropdown_button_ref} onClick={() => setIsSignupDropdown(!is_signup_dropdown)}>
                        Sign up <span className="arrow">{is_signup_dropdown ? "\u25B2" : "\u25BC"}</span>
                    </button>
                    {/* Login dropdown content */}
                    {is_login_dropdown ? (
                        <div className="dropdown-content" ref={login_dropdown_ref}>
                            <h3>Username</h3>
                            <input value={login_username} onChange={(e) => setLoginUsername(e.target.value)}></input>
                            <h3>Password</h3>
                            <input value={login_password} onKeyDown={(e) => handleKeyDown(e, callLogin, login_username, login_password)} onChange={(e) => setLoginPassword(e.target.value)}></input>
                            <button onClick={() => callLogin(login_username, login_password)}>Log in</button>
                            {login_error ? <h3 className="account-status account-error">{login_error}</h3> : null}
                        </div>
                    ) : null}
                    {/* Signup dropdown */}
                    {is_signup_dropdown ? (
                        <div className="dropdown-content" ref={signup_dropdown_ref}>
                            <h3>Username</h3>
                            <input value={signup_username} onChange={(e) => setSignupUsername(e.target.value)}></input>
                            <h3>Password</h3>
                            <input value={signup_password} onKeyDown={(e) => handleKeyDown(e, callCreateAccount, signup_username, signup_password)} onChange={(e) => setSignupPassword(e.target.value)}></input>
                            <button onClick={() => callCreateAccount(signup_username, signup_password)}>Create account</button>
                            {signup_error ? <h3 className="account-status account-error">Error creating account</h3> : null}
                        </div>
                    ) : null}
                </>
            )}
        </nav>
    );
}

function Task({ id, name, completed, fetchTasks }) {
    // Toggle edit task name / status
    const [editing, setEditing] = useState(false);

    // During editing track if completed and new name
    const [completed_checked, setCompletedChecked] = useState(completed);
    const [edit_task_input, setEditTaskInput] = useState(name);

    // Reference to input for editing task name
    const task_input_ref = useRef(null);

    // Toggle editing for task
    function toggleEdit() {
        setEditTaskInput(name);
        setCompletedChecked(completed);
        setEditing(!editing);
    }

    // Delete a task
    async function deleteTask(id) {
        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please log in to delete tasks");
        } else {
            try {
                await axios.delete(`${url}/api/v1/tasks/${id}`, { headers: { authorization: `Bearer ${token}` } });
                await fetchTasks();
            } catch (err) {
                if (err.response.status == 401) {
                    alert("You are not authorized to delete this task");
                } else if (err.response.status == 404) {
                    alert("Task not found");
                } else {
                    alert("Error deleting task");
                }
            }
        }
    }

    // Edit a task
    async function editTask(id) {
        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please log in to edit tasks");
        } else {
            try {
                await axios.patch(`${url}/api/v1/tasks/${id}`, { name: edit_task_input, completed: completed_checked }, { headers: { authorization: `Bearer ${token}` } });
                await fetchTasks();
                toggleEdit();
            } catch (err) {
                if (err.response.status == 401) {
                    alert("You are not authorized to edit this task");
                } else if (err.response.status == 404) {
                    alert("Task not found");
                } else {
                    alert("Error modifying task");
                }
            }
        }
    }

    return editing ? (
        <>
            {/* Editing */}
            <div className={completed ? "task completed-task" : "task"}>
                <input className="completed-checkbox" type="checkbox" checked={completed_checked} onChange={() => setCompletedChecked(!completed_checked)}></input>
                <TextareaAutosize ref={task_input_ref} className="edit-task-name" value={edit_task_input} onChange={(e) => setEditTaskInput(e.target.value)} maxLength="100" minRows="3"></TextareaAutosize>
                <div>
                    <button className="edit-task" onClick={() => toggleEdit()}>
                        Cancel
                    </button>
                    <button className="edit-task-submit" onClick={() => editTask(id)}>
                        Submit
                    </button>
                </div>
            </div>
        </>
    ) : (
        <>
            {/* Not editing */}
            <div className={completed ? "task completed-task" : "task"}>
                <h3>{name}</h3>
                <div>
                    <button className="edit-task" onClick={() => toggleEdit()}>
                        Edit
                    </button>
                    <button className="delete-task" onClick={() => deleteTask(id)}>
                        Delete
                    </button>
                </div>
            </div>
        </>
    );
}

// Hook to handle what happens when you click outside of an element
// onClickOutside is a function for what to do if there is a click outside the element
// inside_refs is an array of refs "inside", which should not trigger onClickOutside
function useClickOutside(inside_refs, onClickOutside) {
    useEffect(() => {
        function handleClickOutside(e) {
            // Check if the click is outside all elements in inside_refs
            let clicked_inside = false;

            for (let i = 0; i < inside_refs.length; i++) {
                if (inside_refs[i].current && inside_refs[i].current.contains(e.target)) {
                    clicked_inside = true;
                    break;
                }
            }

            // If the click is on none of the elements run onClickOutside
            if (!clicked_inside) {
                onClickOutside();
            }
        }

        // Event listener
        document.addEventListener("mousedown", handleClickOutside);

        // Cleanup
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [inside_refs, onClickOutside]);
}

export default Index;
