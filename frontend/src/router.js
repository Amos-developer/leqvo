import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView.vue";
import LoginView from "./views/LoginView.vue";
import RegisterView from "./views/RegisterView.vue";
import ForgotPasswordView from "./views/ForgotPasswordView.vue";
import MarketsView from "./views/MarketsView.vue";
import TradesView from "./views/TradesView.vue";
import HistoryView from "./views/HistoryView.vue";
import AccountView from "./views/AccountView.vue";
import DepositView from "./views/DepositView.vue";
import DepositAddressView from "./views/DepositAddressView.vue";

const routes = [
  { path: "/", name: "home", component: HomeView, meta: { requiresAuth: true } },
  { path: "/markets", name: "markets", component: MarketsView, meta: { requiresAuth: true } },
  { path: "/trade", name: "trade", component: TradesView, meta: { requiresAuth: true } },
  { path: "/trades", redirect: "/trade" },
  { path: "/history", name: "history", component: HistoryView, meta: { requiresAuth: true } },
  { path: "/account", name: "account", component: AccountView, meta: { requiresAuth: true } },
  { path: "/deposit", name: "deposit", component: DepositView, meta: { requiresAuth: true } },
  { path: "/deposit/address", name: "deposit-address", component: DepositAddressView, meta: { requiresAuth: true } },
  { path: "/login", name: "login", component: LoginView },
  { path: "/register", name: "register", component: RegisterView },
  { path: "/forgot-password", name: "forgot-password", component: ForgotPasswordView }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const savedUser = localStorage.getItem("leqvoUser");

  if (to.meta.requiresAuth && !savedUser) {
    return "/login";
  }

  if ((to.name === "login" || to.name === "register") && savedUser) {
    return "/";
  }

  return true;
});

export default router;
