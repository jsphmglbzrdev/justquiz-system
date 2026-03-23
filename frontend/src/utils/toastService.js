import { toast } from "react-toastify";

const commonOptions = {
  position: "bottom-left",
  autoClose: 1800,
  theme: "dark",
};

export const notifySuccess = (message) => {
  toast.success(message, commonOptions);
};

export const notifyError = (message) => {
  toast.error(message, commonOptions);
};

export const notifyInfo = (message) => {
  toast.info(message, commonOptions);
};
