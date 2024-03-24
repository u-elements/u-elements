---
next: false
prev: false
---
<script setup>
import { ref } from 'vue'
import { VPTeamMembers, useSidebar } from 'vitepress/theme'
import { useRoute } from 'vitepress'

const { data: { title } } = useRoute();
const { sidebar } = useSidebar()
const current = sidebar.value.find(({ text, items }) => text === title);
const members = current?.items.map(({ text, link }) => ({
  org: text.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
  orgLink: link
 })) || []
</script>

# Elements

CustomElement implementations of modern HTML tags, ensuring outstanding accessibility.

<VPTeamMembers size="small" :members="members" />