<script setup>
import BottomNavigation from "../components/BottomNavigation.vue";
</script>

<template>
  <section class="phone-shell page-enter">
    <header class="top-bar">
      <strong>12:30</strong>
      <div class="status-pill"></div>
      <div class="status-icons">
        <span></span><span></span><span></span>
      </div>
    </header>

    <div class="app-toolbar">
      <button class="icon-button" aria-label="Menu"><span class="icon-menu"></span></button>
      <button class="icon-button alert" aria-label="Notifications"><span class="icon-bell"></span></button>
    </div>

    <section class="balance-card">
      <div class="balance-copy">
        <h1>Hi Sabbir <span>Waving</span></h1>
        <p>Welcome back to your account</p>
        <span class="muted-label">Total Balance</span>
        <strong>$1,520.00</strong>
        <RouterLink to="/login">View account details</RouterLink>
      </div>
      <div class="hero-asset" aria-hidden="true">
        <div class="sparkle one"></div>
        <div class="sparkle two"></div>
        <div class="money-bag"><span>$</span></div>
        <div class="coin-stack"><i></i><i></i><i></i></div>
        <div class="piggy"></div>
      </div>
    </section>

    <section class="quick-actions" aria-label="Quick actions">
      <button><span class="action-icon pink">↗</span>Send</button>
      <button><span class="action-icon green">↙</span>Receive</button>
      <button><span class="action-icon amber">$</span>Loan</button>
      <button><span class="action-icon blue">+</span>Top Up</button>
    </section>

    <section class="summary-grid">
      <article class="summary-card income">
        <span class="mini-icon"></span>
        <p>Income</p>
        <strong>+$2,450.00</strong>
        <div class="sparkline"></div>
      </article>
      <article class="summary-card expense">
        <span class="mini-icon"></span>
        <p>Expense</p>
        <strong>-$930.00</strong>
        <div class="sparkline"></div>
      </article>
      <article class="summary-card savings">
        <span class="mini-icon"></span>
        <p>Savings</p>
        <strong>$1,520.00</strong>
        <div class="sparkline"></div>
      </article>
    </section>

    <section class="transactions">
      <div class="section-heading">
        <h2>Recent Transaction</h2>
        <RouterLink to="/register">See all</RouterLink>
      </div>
      <div class="search-row">
        <label>
          <span class="icon-search"></span>
          <input type="search" placeholder="Search transactions..." />
        </label>
        <button class="filter-button" aria-label="Filter"><span class="icon-filter"></span></button>
      </div>
      <div class="tabs">
        <button class="active">All</button>
        <button><span class="dot green"></span>Income</button>
        <button><span class="dot pink-dot"></span>Expense</button>
      </div>
      <div class="transaction-list">
        <article>
          <span class="transaction-icon up">↗</span>
          <div>
            <strong>Signal profit</strong>
            <p>Today, 9:24 AM</p>
          </div>
          <b>+$420.00</b>
        </article>
        <article>
          <span class="transaction-icon down">↙</span>
          <div>
            <strong>Wallet top up</strong>
            <p>Yesterday, 4:18 PM</p>
          </div>
          <b>+$180.00</b>
        </article>
      </div>
    </section>

    <BottomNavigation active-item="home" />
  </section>
</template>
