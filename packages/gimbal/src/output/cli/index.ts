import TableComp from '@modus/gimbal-core/lib/components/Table';
import { sectionHeading, successOrFailure } from '@modus/gimbal-core/lib/utils/colors';
import { ParsedArgs } from 'minimist';
import { Report, ReportItem } from '@/typings/command';
import { Config, Data, Table } from '@/typings/components/Table';
import { CliOutputOptions } from '@/typings/output/cli';

const successColorizeRenderer = (value: Data, item: Data): string => successOrFailure(value, item.success);

export const createTable = (args: ParsedArgs, config?: Config): TableComp => {
  const table = new TableComp({
    columns: [
      {
        header: 'Label',
        key: 'label',
        maxWidth: 50,
        renderer: (label, item): string => {
          const { data, success } = item;

          if (data) {
            // bold the label part, colorify the success part
            const successText = successOrFailure(success ? '[ success: ✓ ]' : '[ success: x ]', success);

            return `${sectionHeading(label)} ${successText}`;
          }

          return successOrFailure(label, success);
        },
      },
      {
        header: 'Value',
        key: 'value',
        align: 'center',
        renderer: successColorizeRenderer,
      },
    ],
    ...config,
  });

  if (args.checkThresholds) {
    table.addColumn({
      header: 'Threshold',
      key: 'threshold',
      align: 'center',
      renderer: successColorizeRenderer,
    });

    table.addColumn({
      header: 'Success',
      key: 'success',
      align: 'center',
      renderer: (value: boolean | string): string => {
        if (value === true) {
          return successOrFailure('✓', value);
        }

        if (value === false) {
          return successOrFailure('x', value);
        }

        return value;
      },
    });
  }

  return table;
};

export const outputTable = (report: Report, args: ParsedArgs, options?: CliOutputOptions): Table => {
  const table = options && options.table ? options.table : createTable(args);

  if (report.data) {
    report.data.forEach((item: ReportItem): void => {
      // TODO handle grouped items
      table.add(item);
    });
  }

  return table;
};
