import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrolling; navigation scrolls to the top of each new screen.
window.scrollTo = () => {};
