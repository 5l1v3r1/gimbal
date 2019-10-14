import { register } from '@/module/registry';
import Size from '@/module/size';
import { Report } from '@/typings/command';
import { Options } from '@/typings/module/registry';
import meta from './meta';

register('size', meta, ({ args }: Options): Promise<Report> => Size(args));
