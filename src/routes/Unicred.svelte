<script>
    import BaseLayout from "../components/BaseLayout.svelte";
    import Input from "../components/Input.svelte";
    import SecondaryButton from "../components/SecondaryButton.svelte";
</script>

<BaseLayout title="Uniswap Credentials" icon="/uniswap.svg">
    <Input />
    <SecondaryButton label="Issue 30-Day History" />
    <SecondaryButton label="Issue LP History" />
</BaseLayout>
