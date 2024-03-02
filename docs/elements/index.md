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

Standard HTML tags, solving common user interactions in a flexible and accssible way.

<VPTeamMembers size="small" :members="members" />