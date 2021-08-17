import moment from "moment";

export const ISO_FORMAT = "YYYY-MM-DD";
export const READABLE_FORMAT = "dddd, MMMM Do";
export const SIMPLE_FORMAT = "M/DD";
export const STANDARD_FORMAT = "M/DD/YYYY";

export const parseISO = (date) => moment(date, ISO_FORMAT);
export const parseReadable = (date) => moment(date, READABLE_FORMAT)
export const toISO = (date) => parseReadable(date).format(ISO_FORMAT);
export const toReadable = (date) => parseISO(date).format(READABLE_FORMAT);
export const toSimple = (date) => parseISO(date).format(SIMPLE_FORMAT);
export const toStandard = (date) => parseISO(date).format(STANDARD_FORMAT);

export function firebaseTimeToStateTime(time) {
  if (!time || time === {}) {
    return {};
  }
  let { hours, minutes } = time;
  let isAM = hours < 12;
  if (hours === 0) {
    hours = 12;
  } else if (!isAM) {
    hours -= 12;
  }
  return { hours, minutes, isAM };
}

export function stateTimeToFirebaseTime(time) {
  if (!time || time === {}) {
    return {};
  }
  let { hours, minutes, isAM } = time;
  if (hours === 12) {
    hours -= 12;
  }
  if (!isAM) {
    hours += 12;
  }
  return { hours, minutes };
}