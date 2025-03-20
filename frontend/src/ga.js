import ReactGA from "react-ga4";

const GA_TRACKING_ID = "G-TDX4BZJ0ZG"; 

export const initGA = () => {
  ReactGA.initialize(GA_TRACKING_ID);
};

export const trackPageView = (path) => {
  ReactGA.send({ hitType: "pageview", page: path });
};

export const trackEvent = (category, action, label, params = {}) => {
    ReactGA.event({
      category: category,
      action: action,
      label: label,
      ...params
    });
};
