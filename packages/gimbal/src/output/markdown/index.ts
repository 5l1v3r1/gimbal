import { TableInstanceOptions } from 'cli-table3';
import EventEmitter from '@/event';
import { Report, ReportItem } from '@/typings/command';
import { Config } from '@/typings/components/Table';
import { Context } from '@/typings/context';
import { CliOutputOptions } from '@/typings/output/cli';
import { MarkdownRenderTableEndEvent, MarkdownRenderTableStartEvent } from '@/typings/output/markdown';
import { createTable } from '../cli';

const markdownTableOptions = {
  chars: {
    top: '',
    'top-mid': '',
    'top-left': '',
    'top-right': '',
    bottom: '',
    'bottom-mid': '',
    'bottom-left': '',
    'bottom-right': '',
    left: '|',
    'left-mid': '',
    mid: '',
    'mid-mid': '',
    right: '|',
    'right-mid': '',
    middle: '|',
  },
};

export const tableConfig: Config = {
  options: markdownTableOptions as TableInstanceOptions,
};

export const outputTable = async (report: Report, context: Context, options?: CliOutputOptions): Promise<string> => {
  const hasTable = options && options.table;
  const table = hasTable ? (options as CliOutputOptions).table : createTable(context, tableConfig);

  if (!table) {
    return '';
  }

  if (!hasTable) {
    const commentRenderTableStartEvent: MarkdownRenderTableStartEvent = {
      context,
      options,
      report,
      table,
    };

    await EventEmitter.fire(`output/markdown/render/table/start`, commentRenderTableStartEvent);
  }

  if (report.data) {
    report.data.forEach((item: ReportItem): void => {
      if (item.value != null) {
        table.add(item);
      }
    });
  }

  const markdown = await table.render('markdown');

  if (!hasTable) {
    const commentRenderTableStartEvent: MarkdownRenderTableEndEvent = {
      context,
      markdown,
      options,
      report,
      table,
    };

    await EventEmitter.fire(`output/markdown/render/table/end`, commentRenderTableStartEvent);
  }

  return markdown;
};

const MarkdownOutput = async (report: Report, context: Context): Promise<string> => {
  if (!report.data) {
    return '';
  }

  const output = ['# Gimbal Report'];

  await Promise.all(
    report.data.map(
      async (item: ReportItem): Promise<void> => {
        // such a hack, are the direct children it or is there another level of nesting?
        // this is seeing if there is another level and nest the table under another heading
        if (item.data && item.data[0] && item.data[0].data && item.data[0].data.length) {
          const buffered = [`## ${item.label}`];

          await Promise.all(
            item.data.map(
              async (childItem: ReportItem): Promise<void> => {
                const rendered = await outputTable(childItem, context);

                buffered.push(`### ${childItem.label}`, rendered);
              },
            ),
          );

          output.push(...buffered);
        } else {
          const rendered = await outputTable(item, context);

          output.push(`## ${item.label}`, rendered);
        }
      },
    ),
  );

  return `${output.join('\n\n')}\n`;
};

export default MarkdownOutput;
