<script lang="ts" setup>
import SvgIcon from './SvgIcon.vue';
import type {SvgName} from '../svg.ts';
import {shallowRef} from 'vue';
import {type DiffStatus, type DiffTreeEntry, diffTreeStore} from '../modules/diff-file.ts';

const props = defineProps<{
  item: DiffTreeEntry,
}>();

const store = diffTreeStore();
const collapsed = shallowRef(props.item.IsViewed);

const diffStatusIcons: Record<DiffStatus, {name: SvgName, class: string}> = {
  '': {name: 'octicon-blocked', class: 'tw-text-red'},
  'added': {name: 'octicon-diff-added', class: 'tw-text-diff-added-fg'},
  'modified': {name: 'octicon-diff-modified', class: 'tw-text-yellow'},
  'deleted': {name: 'octicon-diff-removed', class: 'tw-text-diff-removed-fg'},
  'renamed': {name: 'octicon-diff-renamed', class: 'tw-text-teal'},
  'copied': {name: 'octicon-diff-renamed', class: 'tw-text-diff-added-fg'}, // there is no octicon for copied, so renamed should be ok
  'typechanged': {name: 'octicon-diff-modified', class: 'tw-text-diff-added-fg'},
  'unmerged': {name: 'octicon-blocked', class: 'tw-text-red'},
  'unknown': {name: 'octicon-blocked', class: 'tw-text-red'},
};
</script>

<template>
  <template v-if="item.EntryMode === 'tree'">
    <div class="item-directory" :class="{ 'viewed': item.IsViewed }" :title="item.DisplayName" @click.stop="collapsed = !collapsed">
      <!-- directory -->
      <SvgIcon :name="collapsed ? 'octicon-chevron-right' : 'octicon-chevron-down'"/>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span class="tw-contents" v-html="collapsed ? store.folderIcon : store.folderOpenIcon"/>
      <span class="gt-ellipsis">{{ item.DisplayName }}</span>
    </div>

    <div v-show="!collapsed" class="sub-items">
      <DiffFileTreeItem v-for="childItem in item.Children!" :key="childItem.DisplayName" :item="childItem"/>
    </div>
  </template>
  <a
    v-else
    class="item-file" :class="{ 'selected': store.selectedItem === '#diff-' + item.NameHash, 'viewed': item.IsViewed }"
    :title="item.DisplayName" :href="'#diff-' + item.NameHash"
  >
    <!-- file -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <span class="tw-contents" v-html="item.FileIcon"/>
    <span class="gt-ellipsis tw-flex-1">{{ item.DisplayName }}</span>
    <SvgIcon v-bind="diffStatusIcons[item.DiffStatus] ?? diffStatusIcons['']"/>
  </a>
</template>

<style scoped>
a,
a:hover {
  text-decoration: none;
  color: var(--color-text);
}

.sub-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-left: 13px;
  border-left: 1px solid var(--color-secondary);
}

.sub-items .item-file {
  padding-left: 18px;
}

.item-file.selected {
  color: var(--color-text);
  background: var(--color-active);
}

.item-file.viewed,
.item-directory.viewed {
  color: var(--color-text-light-3);
}

.item-directory {
  user-select: none;
}

.item-file,
.item-directory {
  display: flex;
  align-items: center;
  gap: 0.25em;
  padding: 6px;
  border-radius: var(--border-radius-small);
  font-size: var(--font-size-sm);
  transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard);
}

.item-file:hover,
.item-directory:hover {
  color: var(--color-text);
  background: var(--color-hover);
  cursor: pointer;
}
</style>
