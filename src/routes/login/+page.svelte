<script lang="ts">
    import { enhance } from '$app/forms';
    let message = '';
    let username = '';
    let password = '';

    const doLogin = async (e: Event) => {};
</script>

<h1>Login / Register</h1>
<form method="post" action="?/login" use:enhance>
    <label>Username <input name="username" bind:value={username} /></label>
    <label>Password <input type="password" name="password" bind:value={password} /></label>
    <button name="action" value="login">Login</button>
    <button name="action" value="register" formaction="?/register">Register</button>
</form>

<p style="color: red">{message}</p>
