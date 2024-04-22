// Basic stuff
import { useState, useEffect, useRef, useLayoutEffect, forwardRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import axios from "axios";

// Map stuff
import { MapContainer, useMapEvents, TileLayer, Marker, Popup, Polyline, ZoomControl } from "react-leaflet";
import { divIcon } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fontawesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrain, faMagnifyingGlass, faCircleHalfStroke, faSquareCheck, faSquareXmark, faGear } from "@fortawesome/free-solid-svg-icons";
import { faMap } from "@fortawesome/free-regular-svg-icons";

// CSS
import "./index.css";

// My functions
import { useImagePreloader } from "./useImagePreloader.jsx";
import { useClickOutside } from "./useClickOutside.jsx";
import { fetchMetroInfo } from "./fetchMetroInfo.jsx";
import { getStationImg, getLineImg } from "./getMetroImg.jsx";
import { substringBeforeLastSpace } from "./stringFunc.jsx";
import { getChosenLineIds } from "./getChosenLineIds.jsx";

// URL of backend - TODO: change on launch
const url = "http://localhost:5000";
// const url = "https://task-manager-self.fly.dev";

// Webpage container
function Index() {
  // Data about the stations and lines fetched from the backend
  const [stations, setStations] = useState([]);
  const [lines, setLines] = useState([]);
  const [geoHashmap, setGeoHashmap] = useState({});
  const [fetchInfoError, setFetchInfoError] = useState("");

  // User toggles
  const [darkMode, setDarkMode] = useState(true);
  const [enableMap, setEnableMap] = useState(true);

  // Fetches metro info from backend and populates stations, lines, and fetchInfoError (if there was an error fetching info)
  useEffect(() => {
    fetchMetroInfo(url, setStations, setLines, setGeoHashmap, setFetchInfoError);
  }, []);

  // Preloads images
  const imagesLoaded = useImagePreloader(stations, lines);

  // Sets shown/unshown stations depending on which lines are shown
  useEffect(() => {
    let new_stations = [...stations];

    const chosen_line_ids = getChosenLineIds(lines);

    new_stations.forEach((station) => {
      let shown = false;

      station.railways.forEach((railway) => {
        if (chosen_line_ids.includes(railway.id)) {
          shown = true;
        }
      });

      station.shown = shown;
    });

    setStations(new_stations);
  }, [lines]);

  // Two user toggle functions
  function toggleMap() {
    setEnableMap(!enableMap);
  }

  // Dark toggle toggles the "light" class on all elements with class ".dark-toggle"
  function toggleDarkMode() {
    document.querySelectorAll(".dark-toggle").forEach((e) => {
      e.classList.toggle("light");
    });
    setDarkMode(!darkMode);
  }

  return (
    <div className="site-container">
      <Nav toggleMap={toggleMap} toggleDarkMode={toggleDarkMode} stations={stations} setStations={setStations} lines={lines} setLines={setLines} />
      <div className="map-container">
        <MapComponent stations={stations} lines={lines} geoHashmap={geoHashmap} enableMap={enableMap} darkMode={darkMode} />
      </div>
    </div>
  );
}

// Navbar at top
function Nav({ toggleMap, toggleDarkMode, lines, setLines }) {
  // Dropdown toggle for metro lines
  const [settingsDropdown, setSettingsDropdown] = useState(false);
  const [linesDropdown, setLinesDropdown] = useState(false);

  // Closes dropdowns when clicked outside of
  const maptoggle_ref = useRef(null);
  const darkmode_ref = useRef(null);
  const settings_dropdown_ref = useRef(null);
  const lines_dropdown_btn_ref = useRef(null);
  const lines_dropdown_ref = useRef(null);
  useClickOutside([lines_dropdown_btn_ref, lines_dropdown_ref, darkmode_ref, maptoggle_ref], () => {
    setLinesDropdown(false);
  });

  return (
    <nav className="site-nav dark-toggle">
      {/* Settings */}
      <div className="dropdown">
        <FontAwesomeIcon icon={faGear} ref={settings_dropdown_ref} className="nav-icon dark-toggle" onClick={() => setSettingsDropdown(!settingsDropdown)} />
        {settingsDropdown ? <SettingsDropdown /> : null}
      </div>
      {/* Map toggle */}
      <FontAwesomeIcon icon={faMap} ref={maptoggle_ref} className="nav-icon dark-toggle" onClick={() => toggleMap()} />
      {/* Dark mode toggle */}
      <FontAwesomeIcon icon={faCircleHalfStroke} ref={darkmode_ref} className="nav-icon" onClick={() => toggleDarkMode()} />
      {/* Metro lines selector */}
      <div className="dropdown">
        <FontAwesomeIcon icon={faTrain} className="nav-icon" ref={lines_dropdown_btn_ref} onClick={() => setLinesDropdown(!linesDropdown)} />
        {linesDropdown ? <LineSelector ref={lines_dropdown_ref} lines={lines} setLines={setLines} /> : null}
      </div>
      {/* Search */}
      <FontAwesomeIcon icon={faMagnifyingGlass} className="nav-icon nav-search" />
    </nav>
  );
}

// Dropdown from navbar to be able to select lines
const LineSelector = forwardRef(({ lines, setLines }, ref) => {
  // Get chosen line ids in a simple list
  const chosen_line_ids = getChosenLineIds(lines);

  if (lines) {
    lines.forEach((line) => {
      if (line.shown && !chosen_line_ids.includes(line.id)) {
        chosen_line_ids.push(line.id);
      }
    });
  }

  // Toggles a line showing on the map given the line id
  function toggleLineShown(id) {
    let updated_lines = [...lines];

    const shown = updated_lines.find((line) => line.id === id).shown;
    updated_lines.find((line) => line.id === id).shown = !shown;

    setLines(updated_lines);
  }

  // Show all / hide all stuff
  function setAllLines(show) {
    let updated_lines = [...lines];

    updated_lines.forEach((line) => {
      line.shown = show;
    });

    setLines(updated_lines);
  }

  return (
    <div className="dropdown-content right-side dark-toggle" ref={ref}>
      <button className="dropdown-line div-button selected" onClick={() => setAllLines(true)}>
        <span className="metro-img">
          <FontAwesomeIcon className="dropdown-icon" icon={faSquareCheck} />
        </span>
        Select All
      </button>
      <button className="dropdown-line div-button unselected" onClick={() => setAllLines(false)}>
        <span className="metro-img">
          <FontAwesomeIcon className="dropdown-icon" icon={faSquareXmark} />
        </span>
        Deselect All
      </button>
      {lines.map((line) => {
        let selected = false;
        if (chosen_line_ids && chosen_line_ids.includes(line.id)) {
          selected = true;
        }

        return (
          <button className={selected ? "dropdown-line div-button selected" : "dropdown-line div-button unselected"} onClick={() => toggleLineShown(line.id)}>
            <span className="metro-img">
              <img src={getLineImg(line.code[0])} className="metro-img" alt="" />
            </span>
            <p>{substringBeforeLastSpace(line.name.en)}</p>
          </button>
        );
      })}
    </div>
  );
});

// Dropdown from navbar for settings
const SettingsDropdown = forwardRef(({}, ref) => {
  return (
    <div className="dropdown-content left-side dark-toggle" ref={ref}>
      <div className="dropdown-line">
        <h3>Language</h3>
        <select></select>
      </div>
    </div>
  );
});

// Map
function MapComponent({ stations, lines, enableMap, geoHashmap, darkMode }) {
  const map_ref = useRef(null);

  // Show line when hovering over the line and hide when it gets far enough away from the popup
  // The following code is pretty fucked up and idk how it works.
  // I just made it from trying to fix one problem at a time.
  // Note to self: Don't touch this unless you really have to
  const [initialPopupHidden, setInitialPopupHidden] = useState(false);
  const [showMouseOverPopup, setShowMouseOverPopup] = useState(false);
  const [mouseOverPopupImg, setMouseOverPopupImg] = useState("");
  const [mouseOverPopupName, setMouseOverPopupName] = useState("");
  const [mouseOverPopupPos, setMouseOverPopupPos] = useState([35.71, 139.75]);

  useEffect(() => {
    setShowMouseOverPopup(false);
    setInitialPopupHidden(false);
  }, [lines]);

  // Show popup
  function handleMouseOver(e, name, img) {
    if (showMouseOverPopup) return;

    setMouseOverPopupName(name);
    setMouseOverPopupImg(img);
    setMouseOverPopupPos(e.latlng);
    setShowMouseOverPopup(true);
  }

  // Hide initial popup / Hide popup when mouse is far enough away
  function MapEvents() {
    useMapEvents({
      mousemove: (e) => {
        if (!showMouseOverPopup) return;

        // Calculate distance between mouse position and popup position
        const popup_point = map_ref.current.latLngToContainerPoint(mouseOverPopupPos);
        const mouse_point = map_ref.current.mouseEventToContainerPoint(e.originalEvent);
        const distance = popup_point.distanceTo(mouse_point);

        // Hide the popup if the distance is greater than a threshold
        if (distance > 25) {
          setShowMouseOverPopup(false);
          map_ref.current.closePopup();
        }
      },
      popupopen: () => {
        if (!initialPopupHidden) {
          map_ref.current.closePopup();
          setInitialPopupHidden(true);
        }
      },
    });

    return null;
  }

  // Train icon
  const icon_markup = renderToStaticMarkup(<FontAwesomeIcon className="map-icon dark-toggle" icon={faTrain} />);
  const custom_icon = divIcon({
    html: icon_markup,
  });

  return (
    <>
      {/* Div to color background if map is disabled */}
      <div className="map-background dark-toggle">
        <MapContainer className="map" ref={map_ref} center={[35.71, 139.75]} zoom={12} zoomControl={false} attributionControl={false}>
          <MapEvents />
          {enableMap ? (
            <TileLayer
              url={
                darkMode
                  ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                  : "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              }
            />
          ) : null}
          <ZoomControl position="bottomleft" />
          {/* Maps stations into markers on the map */}
          {stations.map((station) => {
            if (!station.shown) {
              return null;
            }

            const code = station.railways[0].code;
            const index = station.railways[0].index;

            return (
              <Marker className="dark-toggle" position={[station.geo.lat, station.geo.long]} width="30px" height="30px" icon={custom_icon}>
                <Popup className="dark-toggle">
                  <div className="popup-data">
                    <h3>{station.name.en}</h3>
                    <div className="line-imgs">
                      {station.railways.map((railway) => {
                        return (
                          <div className="map-popup-line">
                            <img className="dark-toggle" src={getStationImg(railway.code, railway.index)}></img>
                            <h3>
                              {railway.name} {railway.index}
                            </h3>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Draws lines between markers for each metro line */}
          {lines.map((line) => {
            if (!line.shown) {
              return null;
            }

            return (
              <>
                {/* Outline */}
                <Polyline
                  positions={line.stationOrder.map((station) => {
                    return geoHashmap[station.station];
                  })}
                  pathOptions={{
                    color: "#000000",
                    weight: 5,
                  }}
                  eventHandlers={{
                    mouseover: (e) => handleMouseOver(e, line.name.en, getLineImg(line.code)),
                  }}
                />
                {/* The line itself */}
                <Polyline
                  positions={line.stationOrder.map((station) => {
                    return geoHashmap[station.station];
                  })}
                  pathOptions={{
                    color: line.color,
                    weight: 3,
                  }}
                />
                {/* Hover over line to show line name */}
                <Popup className={"line-hover-popup dark-toggle"} position={mouseOverPopupPos}>
                  <div className="map-popup-line">
                    <img className="dark-toggle" src={mouseOverPopupImg}></img>
                    <h3>{mouseOverPopupName}</h3>
                  </div>
                </Popup>
              </>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}

export default Index;

// function Index() {
//     // List of tasks
//     const [tasks, setTasks] = useState([]);

//     // Errors for fetching and creating a task
//     const [fetch_error, setFetchError] = useState(false);
//     const [create_error, setCreateError] = useState(false);

//     // Logged in user information
//     const [is_logged_in, setIsLoggedIn] = useState(false);
//     const [username, setUsername] = useState("");

//     // Create task input and submit reference
//     const input_ref = useRef(null);
//     const submit_ref = useRef(null);

//     useEffect(() => {
//         // Check token to see if we are logged in
//         if (localStorage.getItem("token") === null) {
//             setIsLoggedIn(false);
//         } else {
//             setIsLoggedIn(true);
//             setUsername(jwtDecode(localStorage.getItem("token")).username);
//         }

//         // Get all tasks for the user
//         fetchTasks();

//         // Match the height of the submit button to the height of the input next to it and add a listener to do this automatically
//         resizeSubmit();
//         window.addEventListener("resize", resizeSubmit);

//         // Cleanup function
//         return () => {
//             window.removeEventListener("resize", resizeSubmit);
//         };
//     }, []);

//     // Log into account. If successful, set localStorage item token to the response token to log in. Set username by decoding token
//     async function login(login_username, login_password) {
//         try {
//             const response = await axios.post(`${url}/api/v1/tasks/login`, { username: login_username, password: login_password });
//             localStorage.setItem("token", response.data.token);
//             setIsLoggedIn(true);
//             setUsername(jwtDecode(localStorage.getItem("token")).username);
//             await fetchTasks();
//         } catch (err) {
//             throw err;
//         }
//     }

//     // Log out of account and clear token
//     function logout() {
//         localStorage.removeItem("token");
//         setIsLoggedIn(false);
//         setUsername("");
//         fetchTasks();
//     }

//     // Create new account and set token and username. Returns true on success and false otherwise
//     async function createAccount(signup_username, signup_password) {
//         try {
//             const response = await axios.post(`${url}/api/v1/tasks/signup`, { username: signup_username, password: signup_password });
//             localStorage.setItem("token", response.data.token);
//             setIsLoggedIn(true);
//             setUsername(jwtDecode(localStorage.getItem("token")).username);
//             fetchTasks();
//             return true;
//         } catch (err) {
//             throw err;
//         }
//     }

//     // Handles enter to submit create task
//     function handleKeyDown(e) {
//         if (e.key === "Enter") {
//             createTask();
//         }
//     }

//     // Resizes the submit button to match the height of the input next to it
//     function resizeSubmit() {
//         if (submit_ref.current && input_ref.current) {
//             submit_ref.current.style.height = input_ref.current.style.height;
//         }
//     }

//     // Gets all the user's tasks
//     async function fetchTasks() {
//         const token = localStorage.getItem("token");

//         if (!token) {
//             setFetchError("Please log in to access tasks");
//         } else {
//             try {
//                 const response = await axios.get(`${url}/api/v1/tasks`, { headers: { authorization: `Bearer ${token}` } });
//                 setFetchError("");
//                 setTasks(response.data);
//             } catch (err) {
//                 setFetchError("Error finding tasks");
//             }
//         }
//     }

//     // Creates a task for the user
//     async function createTask() {
//         const token = localStorage.getItem("token");

//         if (!token) {
//             setCreateError("Please log in to create tasks");
//         } else {
//             try {
//                 const response = await axios.post(`${url}/api/v1/tasks`, { name: input_ref.current.value }, { headers: { authorization: `Bearer ${token}` } });
//                 await fetchTasks();
//                 input_ref.current.value = "";
//                 setCreateError("");
//             } catch (err) {
//                 setCreateError("Error creating task. Try logging back in or try later");
//             }
//         }
//     }

//     // Injects the tasks into html
//     const task_list_inject = tasks.map((task) => {
//         return <Task id={task._id} name={task.name} completed={task.completed} fetchTasks={fetchTasks} />;
//     });

//     return (
//         <>
//             {/* Login nav */}
//             <LoginNav is_logged_in={is_logged_in} username={username} login={login} logout={logout} createAccount={createAccount}></LoginNav>
//             {/* Title */}
//             <h1 className="title">Task Manager</h1>
//             {/* Add task */}
//             <div className="add-task">
//                 <h2>Add Task</h2>
//                 <div>
//                     <TextareaAutosize name="new-task" id="new-task-name" onKeyDown={(e) => handleKeyDown(e)} onHeightChange={() => resizeSubmit()} ref={input_ref} maxLength="100" minRows="3"></TextareaAutosize>
//                     <button onClick={() => createTask()} ref={submit_ref}>
//                         Submit
//                     </button>
//                 </div>
//                 {create_error ? (
//                     <div className="error-text-div">
//                         <h2 className="error-text">{create_error}</h2>
//                     </div>
//                 ) : null}
//             </div>
//             {/* Fetched tasks */}
//             {fetch_error ? <h2 className="error-text">{fetch_error}</h2> : <ul className="task-list">{task_list_inject}</ul>}
//         </>
//     );
// }

// function LoginNav({ is_logged_in, username, login, logout, createAccount }) {
//     // Login form dropdown toggle and input states
//     const [is_login_dropdown, setIsLoginDropdown] = useState(false);
//     const [login_username, setLoginUsername] = useState("");
//     const [login_password, setLoginPassword] = useState("");
//     const [login_error, setLoginError] = useState(false);

//     // Signup form dropdown toggle and input states
//     const [is_signup_dropdown, setIsSignupDropdown] = useState(false);
//     const [signup_username, setSignupUsername] = useState("");
//     const [signup_password, setSignupPassword] = useState("");
//     const [signup_error, setSignupError] = useState(false);

//     // References to dropdown toggles and dropdowns
//     const login_dropdown_button_ref = useRef(null);
//     const login_dropdown_ref = useRef(null);

//     const signup_dropdown_button_ref = useRef(null);
//     const signup_dropdown_ref = useRef(null);

//     // Close login and signup dropdowns when clicking somewhere else
//     useClickOutside([login_dropdown_button_ref, login_dropdown_ref], () => {
//         setIsLoginDropdown(false);
//     });

//     useClickOutside([signup_dropdown_button_ref, signup_dropdown_ref], () => {
//         setIsSignupDropdown(false);
//         setSignupError(false);
//     });

//     // Handles enter to login / signup
//     function handleKeyDown(e, fn, arg1, arg2) {
//         if (e.key === "Enter") {
//             fn(arg1, arg2);
//         }
//     }

//     // Wrapper function for login function passed in from parents.
//     async function callLogin(login_username, login_password) {
//         try {
//             await login(login_username, login_password);
//             setLoginError("");
//             setLoginUsername("");
//             setLoginPassword("");
//             setSignupUsername("");
//             setSignupPassword("");
//         } catch (err) {
//             if (err.response.status == 401) {
//                 setLoginError(err.response.data.message);
//             } else {
//                 setLoginError("Error logging in");
//             }
//         }
//     }

//     // Wrapper function for the create account function passed in from parent. Clears some inputs too
//     async function callCreateAccount(signup_username, signup_password) {
//         try {
//             await createAccount(signup_username, signup_password);
//             setSignupError(false);
//             setSignupUsername("");
//             setSignupPassword("");
//             setLoginUsername("");
//             setLoginPassword("");
//         } catch (err) {
//             setSignupError(true);
//         }
//     }

//     return (
//         <nav className="nav-bar">
//             <a href="https://github.com/ZinnMortonOSU/Task-Manager-Website">Project Github Repo</a>
//             {is_logged_in ? (
//                 <>
//                     {/* If logged in show username and logout */}
//                     <h1>Hello, {username}</h1>
//                     <button onClick={() => logout()}>Log out</button>
//                 </>
//             ) : (
//                 <>
//                     {/* If not logged in show login and signup */}
//                     {/* Login dropdown toggle button */}
//                     <button className="toggle-dropdown" ref={login_dropdown_button_ref} onClick={() => setIsLoginDropdown(!is_login_dropdown)}>
//                         Log in<span className="arrow">{is_login_dropdown ? "\u25B2" : "\u25BC"}</span>
//                     </button>
//                     {/* Signup dropdown toggle button */}
//                     <button className="toggle-dropdown" ref={signup_dropdown_button_ref} onClick={() => setIsSignupDropdown(!is_signup_dropdown)}>
//                         Sign up <span className="arrow">{is_signup_dropdown ? "\u25B2" : "\u25BC"}</span>
//                     </button>
//                     {/* Login dropdown content */}
//                     {is_login_dropdown ? (
//                         <div className="dropdown-content" ref={login_dropdown_ref}>
//                             <h3>Username</h3>
//                             <input value={login_username} onChange={(e) => setLoginUsername(e.target.value)}></input>
//                             <h3>Password</h3>
//                             <input value={login_password} onKeyDown={(e) => handleKeyDown(e, callLogin, login_username, login_password)} onChange={(e) => setLoginPassword(e.target.value)}></input>
//                             <button onClick={() => callLogin(login_username, login_password)}>Log in</button>
//                             {login_error ? <h3 className="account-status account-error">{login_error}</h3> : null}
//                         </div>
//                     ) : null}
//                     {/* Signup dropdown */}
//                     {is_signup_dropdown ? (
//                         <div className="dropdown-content" ref={signup_dropdown_ref}>
//                             <h3>Username</h3>
//                             <input value={signup_username} onChange={(e) => setSignupUsername(e.target.value)}></input>
//                             <h3>Password</h3>
//                             <input value={signup_password} onKeyDown={(e) => handleKeyDown(e, callCreateAccount, signup_username, signup_password)} onChange={(e) => setSignupPassword(e.target.value)}></input>
//                             <button onClick={() => callCreateAccount(signup_username, signup_password)}>Create account</button>
//                             {signup_error ? <h3 className="account-status account-error">Error creating account</h3> : null}
//                         </div>
//                     ) : null}
//                 </>
//             )}
//         </nav>
//     );
// }

// function Task({ id, name, completed, fetchTasks }) {
//     // Toggle edit task name / status
//     const [editing, setEditing] = useState(false);

//     // During editing track if completed and new name
//     const [completed_checked, setCompletedChecked] = useState(completed);
//     const [edit_task_input, setEditTaskInput] = useState(name);

//     // Reference to input for editing task name
//     const task_input_ref = useRef(null);

//     // Toggle editing for task
//     function toggleEdit() {
//         setEditTaskInput(name);
//         setCompletedChecked(completed);
//         setEditing(!editing);
//     }

//     // Delete a task
//     async function deleteTask(id) {
//         const token = localStorage.getItem("token");

//         if (!token) {
//             alert("Please log in to delete tasks");
//         } else {
//             try {
//                 await axios.delete(`${url}/api/v1/tasks/${id}`, { headers: { authorization: `Bearer ${token}` } });
//                 await fetchTasks();
//             } catch (err) {
//                 if (err.response.status == 401) {
//                     alert("You are not authorized to delete this task");
//                 } else if (err.response.status == 404) {
//                     alert("Task not found");
//                 } else {
//                     alert("Error deleting task");
//                 }
//             }
//         }
//     }

//     // Edit a task
//     async function editTask(id) {
//         const token = localStorage.getItem("token");

//         if (!token) {
//             alert("Please log in to edit tasks");
//         } else {
//             try {
//                 await axios.patch(`${url}/api/v1/tasks/${id}`, { name: edit_task_input, completed: completed_checked }, { headers: { authorization: `Bearer ${token}` } });
//                 await fetchTasks();
//                 toggleEdit();
//             } catch (err) {
//                 if (err.response.status == 401) {
//                     alert("You are not authorized to edit this task");
//                 } else if (err.response.status == 404) {
//                     alert("Task not found");
//                 } else {
//                     alert("Error modifying task");
//                 }
//             }
//         }
//     }

//     return editing ? (
//         <>
//             {/* Editing */}
//             <div className={completed ? "task completed-task" : "task"}>
//                 <input className="completed-checkbox" type="checkbox" checked={completed_checked} onChange={() => setCompletedChecked(!completed_checked)}></input>
//                 <TextareaAutosize ref={task_input_ref} className="edit-task-name" value={edit_task_input} onChange={(e) => setEditTaskInput(e.target.value)} maxLength="100" minRows="3"></TextareaAutosize>
//                 <div>
//                     <button className="edit-task" onClick={() => toggleEdit()}>
//                         Cancel
//                     </button>
//                     <button className="edit-task-submit" onClick={() => editTask(id)}>
//                         Submit
//                     </button>
//                 </div>
//             </div>
//         </>
//     ) : (
//         <>
//             {/* Not editing */}
//             <div className={completed ? "task completed-task" : "task"}>
//                 <h3>{name}</h3>
//                 <div>
//                     <button className="edit-task" onClick={() => toggleEdit()}>
//                         Edit
//                     </button>
//                     <button className="delete-task" onClick={() => deleteTask(id)}>
//                         Delete
//                     </button>
//                 </div>
//             </div>
//         </>
//     );
// }

// // Hook to handle what happens when you click outside of an element
// // onClickOutside is a function for what to do if there is a click outside the element
// // inside_refs is an array of refs "inside", which should not trigger onClickOutside
// function useClickOutside(inside_refs, onClickOutside) {
//     useEffect(() => {
//         function handleClickOutside(e) {
//             // Check if the click is outside all elements in inside_refs
//             let clicked_inside = false;

//             for (let i = 0; i < inside_refs.length; i++) {
//                 if (inside_refs[i].current && inside_refs[i].current.contains(e.target)) {
//                     clicked_inside = true;
//                     break;
//                 }
//             }

//             // If the click is on none of the elements run onClickOutside
//             if (!clicked_inside) {
//                 onClickOutside();
//             }
//         }

//         // Event listener
//         document.addEventListener("mousedown", handleClickOutside);

//         // Cleanup
//         return () => {
//             document.removeEventListener("mousedown", handleClickOutside);
//         };
//     }, [inside_refs, onClickOutside]);
// }
