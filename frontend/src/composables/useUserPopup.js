import { reactive } from "vue";

const defaultState = () => ({
  visible: false,
  tone: "success",
  title: "",
  message: "",
  buttonLabel: "OK",
  secondaryLabel: "",
  onConfirm: null,
  onSecondary: null
});

const popupState = reactive(defaultState());

export const closeUserPopup = () => {
  Object.assign(popupState, defaultState());
};

export const showUserPopup = ({
  tone = "success",
  title,
  message,
  buttonLabel = "OK",
  secondaryLabel = "",
  onConfirm = null,
  onSecondary = null
}) => {
  popupState.visible = true;
  popupState.tone = tone;
  popupState.title = title;
  popupState.message = message;
  popupState.buttonLabel = buttonLabel;
  popupState.secondaryLabel = secondaryLabel;
  popupState.onConfirm = onConfirm;
  popupState.onSecondary = onSecondary;
};

export const useUserPopup = () => {
  return {
    popupState,
    showUserPopup,
    closeUserPopup
  };
};
