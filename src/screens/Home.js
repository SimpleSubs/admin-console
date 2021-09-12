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
  dynamicMenuListener,
  usersListener,
  changeDomain
} from "../redux/Actions";
import Picker from "../components/Picker";

const PAGES = [
  { title: "Orders", link: "orders" },
  { title: "Users", link: "users" },
  { title: "App Settings", link: "app-settings" }
];
const LOGO_SVG = require("../assets/logo.svg");

const Home = ({ logOut, userDataListener, orderListener, usersListener, appSettingsListener, dynamicMenuListener, domainListener, isLoggedIn, domain, dynamicMenus, domainOptions, changeDomain }) => {
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
  React.useEffect(() => dynamicMenuListener(dynamicMenus, domain), [dynamicMenuListener, dynamicMenus, domain]);
  React.useEffect(() => domainListener(isLoggedIn, domain), [domainListener, domain, isLoggedIn]);

  return (
    <>
      <header ref={navbar}>
        <div>
          <img src={LOGO_SVG} alt={"SimpleSubs Logo"} />
          <h3>SimpleSubs Admin Console</h3>
        </div>
        <Picker className={"domain-picker"} value={domain} onChange={(e) => changeDomain({ id: e.target.value })}>
          {domainOptions.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </Picker>
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

const mapStateToProps = ({ user, domain, appSettings, domainOptions }) => ({
  isLoggedIn: !!user,
  domain: domain.id,
  dynamicMenus: !!appSettings?.orderOptions?.dynamic,
  domainOptions
});

const mapDispatchToProps = (dispatch) => ({
  logOut: () => logOut(dispatch),
  userDataListener: (uid, domain) => userDataListener(dispatch, uid, domain),
  orderListener: (isLoggedIn, domain) => orderListener(dispatch, isLoggedIn, domain),
  usersListener: (isLoggedIn, domain) => usersListener(dispatch, isLoggedIn, domain),
  appSettingsListener: (isLoggedIn, domain) => appSettingsListener(dispatch, isLoggedIn, domain),
  dynamicMenuListener: (dynamic, domain) => dynamicMenuListener(dispatch, dynamic, domain),
  domainListener: (isLoggedIn, domainId) => domainListener(dispatch, isLoggedIn, domainId),
  changeDomain: (domain) => changeDomain(domain, dispatch)
});

export default connect(mapStateToProps, mapDispatchToProps)(Home);