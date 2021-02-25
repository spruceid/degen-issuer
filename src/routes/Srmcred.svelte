<script>
  import BaseLayout from "../components/BaseLayout.svelte";
  import Input from "../components/Input.svelte";
  import SecondaryButton from "../components/SecondaryButton.svelte";
  import { save } from "../mediator.js";
</script>

<BaseLayout title="Serum Credentials" icon="/serum.svg">
  <Input />
  <SecondaryButton
    label="Issue 30-Day History"
    onclick={(e) => {
      e.preventDefault();
      //TODO: get VC
      let vc = "";
      save(vc);
    }}
  />
  <SecondaryButton label="Issue LP History" />
</BaseLayout>
