import React from "react";
import { Link } from "react-router-dom";
import "../stylesheets/PageNotFound.css";

const DANCING_SANDWICH = require("../assets/dancing-sandwich.gif");

const PageNotFound = () => (
  <div className={"page-not-found"}>
    <div>
      <h1>404</h1>
      <h2>Sorry, page not found</h2>
      <p>
        Remember those old 404 pages from the 90s that said something like "Something's gone wrong, but don't worry, our
        webmasters have been notified." But were the webmasters ever notified? I mean, were they really?
      </p>
      <Link to={"/"}>
        <i className="fas fa-arrow-left" />
        Take me back
      </Link>
    </div>
    <img src={DANCING_SANDWICH} alt={"Dancing sandwich"} />
  </div>
);

export default PageNotFound;