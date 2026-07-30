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
import WithdrawalView from "./views/WithdrawalView.vue";
import TeamView from "./views/TeamView.vue";
import InviteView from "./views/InviteView.vue";
import LuckyBoxView from "./views/LuckyBoxView.vue";
import AdminView from "./views/AdminView.vue";

const routes = [
  { path: "/", name: "home", component: HomeView, meta: { requiresAuth: true } },
  { path: "/markets", name: "markets", component: MarketsView, meta: { requiresAuth: true } },
  { path: "/trade", name: "trade", component: TradesView, meta: { requiresAuth: true } },
  { path: "/trades", redirect: "/trade" },
  { path: "/history", name: "history", component: HistoryView, meta: { requiresAuth: true } },
  { path: "/account", name: "account", component: AccountView, meta: { requiresAuth: true } },
  { path: "/deposit", name: "deposit", component: DepositView, meta: { requiresAuth: true } },
  { path: "/deposit/address", name: "deposit-address", component: DepositAddressView, meta: { requiresAuth: true } },
  { path: "/withdrawal", name: "withdrawal", component: WithdrawalView, meta: { requiresAuth: true } },
  { path: "/invite", name: "invite", component: InviteView, meta: { requiresAuth: true } },
  { path: "/lucky-box", name: "lucky-box", component: LuckyBoxView, meta: { requiresAuth: true } },
  { path: "/team", name: "team", component: TeamView, meta: { requiresAuth: true } },
  {
    path: "/admin/:section?",
    name: "admin",
    component: AdminView,
    meta: { requiresAuth: true, requiresAdmin: true, hideFooter: true }
  },
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
  const savedToken = localStorage.getItem("leqvoToken");
  let hasStoredSession = Boolean(savedUser && savedToken);
  let user = null;

  try {
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    localStorage.removeItem("leqvoUser");
    localStorage.removeItem("leqvoToken");
    hasStoredSession = false;
  }

  if (to.meta.requiresAuth && !hasStoredSession) {
    localStorage.removeItem("leqvoUser");
    localStorage.removeItem("leqvoToken");
    return "/login";
  }

  if (to.meta.requiresAdmin && !user?.isAdmin) {
    return "/";
  }

  if ((to.name === "login" || to.name === "register") && hasStoredSession) {
    return user?.isAdmin ? "/admin" : "/";
  }

  return true;
});

export default router;
