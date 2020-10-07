import moment from "moment";

export const ISO_FORMAT = "YYYY-MM-DD";
export const READABLE_FORMAT = "dddd, MMMM Do";

export const parseISO = (date) => moment(date, ISO_FORMAT);
export const parseReadable = (date) => moment(date, READABLE_FORMAT)
export const toISO = (date) => parseReadable(date).format(ISO_FORMAT);
export const toReadable = (date) => parseISO(date).format(READABLE_FORMAT);