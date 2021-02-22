<script>
	import Button from './../components/Button.svelte';
    import RouteLayout from './../components/RouteLayout.svelte';
</script>

<RouteLayout>
    <h2>Serum Credentials</h2>
    <a href="/"><button>Back</button></a>
    <div class="btn-group">
        <input />
        <Button label="Issue 30-Day History" />
        <Button label="Issue LP History" />
    </div>
</RouteLayout>
