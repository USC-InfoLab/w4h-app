// Tree-shaken ECharts registration (ADR-029). Only the chart types the platform uses.
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import {
  BarChart,
  BoxplotChart,
  HeatmapChart,
  LineChart,
  ScatterChart,
} from 'echarts/charts';
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';

use([
  CanvasRenderer,
  BarChart,
  BoxplotChart,
  HeatmapChart,
  LineChart,
  ScatterChart,
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  TooltipComponent,
  VisualMapComponent,
]);

export { default as VChart } from 'vue-echarts';
