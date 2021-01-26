import React from "react";
import "../stylesheets/Home.scss";
import { Switch, Route, Link, useRouteMatch, Redirect, useLocation } from "react-router-dom";
import Orders from "./Orders";
import Users from "./Users";
import AppSettings from "./AppSettings";
import { connect } from "react-redux";
import {
  appSettingsListener,
  domainListener,
  logOut,
  orderListener,
  userDataListener,
  usersListener
} from "../redux/Actions";

const PAGES = [
  { title: "Orders", link: "orders" },
  { title: "Users", link: "users" },
  { title: "App Settings", link: "app-settings" }
];
const LOGO_SVG = require("../assets/logo.svg");

const Home = ({ logOut, userDataListener, orderListener, usersListener, appSettingsListener, domainListener, isLoggedIn, domain }) => {
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
  React.useEffect(() => userDataListener(domain), [userDataListener, domain]);
  React.useEffect(() => orderListener(isLoggedIn, domain), [orderListener, domain, isLoggedIn]);
  React.useEffect(() => usersListener(isLoggedIn, domain), [usersListener, domain, isLoggedIn]);
  React.useEffect(() => appSettingsListener(isLoggedIn, domain), [appSettingsListener, domain, isLoggedIn]);
  React.useEffect(() => domainListener(isLoggedIn, domain), [domainListener, domain, isLoggedIn]);

  return (
    <>
      <header ref={navbar}>
        <div>
          <img src={LOGO_SVG} alt={"SimpleSubs Logo"} />
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

const mapStateToProps = ({ user, domain }) => ({
  isLoggedIn: !!user,
  domain: domain.id
});

const mapDispatchToProps = (dispatch) => ({
  logOut: () => logOut(dispatch),
  userDataListener: (uid, domain) => userDataListener(dispatch, uid, domain),
  orderListener: (isLoggedIn, domain) => orderListener(dispatch, isLoggedIn, domain),
  usersListener: (isLoggedIn, domain) => usersListener(dispatch, isLoggedIn, domain),
  appSettingsListener: (isLoggedIn, domain) => appSettingsListener(dispatch, isLoggedIn, domain),
  domainListener: (isLoggedIn, domainId) => domainListener(dispatch, isLoggedIn, domainId)
});

export default connect(mapStateToProps, mapDispatchToProps)(Home);