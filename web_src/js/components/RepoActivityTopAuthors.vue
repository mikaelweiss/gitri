<script lang="ts" setup>
const barSlotWidth = 40; // horizontal space allotted per author
const chartHeight = 100; // keep in sync with reserved height in template
const innerChartHeight = chartHeight - 28; // 28 = avatar/x-axis label row (20) + 8px padding
const barMidPoint = barSlotWidth / 2;
const barWidth = barSlotWidth - 2; // 2px gap between bars
const avatarSize = 20;
const labelInsideThreshold = 22; // bars at least this tall carry the commit count inside them

const activityTopAuthors = window.config.pageData.repoActivityTopAuthors || [];

const graphWidth = activityTopAuthors.length * barSlotWidth;
const maxCommits = Math.max(...activityTopAuthors.map((author) => author.commits));

const bars = activityTopAuthors.map((author, index) => {
  const height = author.commits / maxCommits * innerChartHeight;
  return {
    author,
    index,
    x: index * barSlotWidth,
    height,
    yOffset: innerChartHeight - height,
    labelInside: height >= labelInsideThreshold,
  };
});
</script>

<template>
  <div>
    <svg :width="graphWidth" :height="chartHeight">
      <g v-for="bar in bars" :key="bar.index" :transform="`translate(${bar.x},0)`">
        <title>{{ bar.author.name }}</title>
        <rect class="bar" rx="3" :width="barWidth" :height="bar.height" :x="2" :y="bar.yOffset"/>
        <text
          class="bar-label"
          :class="{'label-inside': bar.labelInside}"
          :x="barMidPoint"
          :y="bar.yOffset"
          :dy="bar.labelInside ? '15px' : '-5px'"
          text-anchor="middle"
        >{{ bar.author.commits }}</text>
        <a v-if="bar.author.home_link" :href="bar.author.home_link">
          <image class="bar-avatar" :x="barMidPoint - avatarSize / 2" :y="innerChartHeight + 4" :height="avatarSize" :width="avatarSize" :href="bar.author.avatar_link"/>
        </a>
        <image v-else class="bar-avatar" :x="barMidPoint - avatarSize / 2" :y="innerChartHeight + 4" :height="avatarSize" :width="avatarSize" :href="bar.author.avatar_link"/>
        <line class="axis-line" :x1="barMidPoint" :x2="barMidPoint" :y1="innerChartHeight + 3" :y2="innerChartHeight"/>
      </g>
      <line class="axis-line" :x1="2" :x2="graphWidth" :y1="innerChartHeight" :y2="innerChartHeight"/>
    </svg>
  </div>
</template>

<style scoped>
svg {
  display: block; /* avoid the inline-baseline gap so the reserved container height matches exactly */
}
.axis-line {
  stroke: var(--color-secondary);
  stroke-width: 1;
}
.bar {
  fill: var(--color-primary);
}
.bar-avatar {
  clip-path: circle(50%);
}
.bar-label {
  fill: var(--color-text);
  font-family: var(--fonts-regular);
  font-size: var(--font-size-xs);
}
.label-inside {
  fill: var(--color-primary-contrast);
}
</style>
