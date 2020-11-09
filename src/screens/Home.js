import React from "react";
import "../stylesheets/Home.css";
import { Switch, Route, Link, useRouteMatch, Redirect, useLocation } from "react-router-dom";
import Orders from "./Orders";
import Users from "./Users";
import AppSettings from "./AppSettings";
import { connect } from "react-redux";
import { appSettingsListener, logOut, orderListener, userDataListener, usersListener } from "../redux/Actions";

const PAGES = [
  { title: "Orders", link: "orders" },
  { title: "Users", link: "users" },
  { title: "App Settings", link: "app-settings" }
]

const Home = ({ logOut, userDataListener, orderListener, usersListener, appSettingsListener, isLoggedIn }) => {
  const [navbarHeight, setHeight] = React.useState(0);
  const [pageIndex, setPageIndex] = React.useState(0);
  const { path, url } = useRouteMatch();
  const location = useLocation();
  const navbar = React.useRef();

  React.useEffect(() => {
    setHeight(navbar.current.getBoundingClientRect().height);
  }, [setHeight, navbar]);
  React.useEffect(() => {
    let locationArr = location.pathname.split("/");
    let currentPage = locationArr[locationArr.length - 1];
    let index = PAGES.findIndex(({ link }) => link === currentPage);
    setPageIndex(index);
  }, [location]);
  React.useEffect(userDataListener, []);
  React.useEffect(() => orderListener(isLoggedIn), [isLoggedIn]);
  React.useEffect(() => usersListener(isLoggedIn), [isLoggedIn]);
  React.useEffect(() => appSettingsListener(isLoggedIn), [isLoggedIn]);

  return (
    <>
      <header ref={(ref) => navbar.current = ref}>
        <div>
          <h3>SimpleSubs Admin Console</h3>
        </div>
        <button className={"styled-button log-out"} onClick={logOut}>
          Log out
          <i className={"fas fa-sign-out-alt"} />
        </button>
      </header>
      <div id={"Home"} className={"container"}>
        <nav className={"side-bar"}>
          <ul>
            {PAGES.map(({ title, link }, index) => (
              <li key={title}>
                {index === 0 && <div className={"nav-link-accent"} style={{ transform: `translateY(${pageIndex}00%)`}} />}
                <Link className={"nav-link"} to={`${url}/${link}`}>
                  {title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Switch>
          <Route path={`${path}/`} exact render={({ location }) => <Redirect to={{ pathname: `${path}/orders`, state: { from: location } }} />} />
          <Route path={`${path}/orders`}>
            <Orders navbarHeight={navbarHeight} />
          </Route>
          <Route path={`${path}/users`}>
            <Users navbarHeight={navbarHeight} />
          </Route>
          <Route path={`${path}/app-settings`}>
            <AppSettings navbarHeight={navbarHeight} />
          </Route>
        </Switch>
      </div>
    </>
  )
};

const mapStateToProps = ({ user }) => ({
  isLoggedIn: !!user
});

const mapDispatchToProps = (dispatch) => ({
  logOut: () => logOut(dispatch),
  userDataListener: (uid) => userDataListener(dispatch, uid),
  orderListener: (isLoggedIn) => orderListener(dispatch, isLoggedIn),
  usersListener: (isLoggedIn) => usersListener(dispatch, isLoggedIn),
  appSettingsListener: (isLoggedIn) => appSettingsListener(dispatch, isLoggedIn)
});

export default connect(mapStateToProps, mapDispatchToProps)(Home);