"use client";

import React from 'react';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/vi';

// Ensure plugins are registered in the client runtime. This component renders nothing.
try {
  // @ts-ignore
  if (!dayjs.prototype.weekday) {
    dayjs.extend(weekday);
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('Dayjs client plugin registration failed', e);
}

try { if (!dayjs.prototype.utc) dayjs.extend(utc); } catch (e) {}
try { if (!dayjs.prototype.format) dayjs.extend(customParseFormat); } catch (e) {}
try { if (!dayjs.prototype.localeData) dayjs.extend(localeData); } catch (e) {}

// set locale to Vietnamese (matches other components)
try { dayjs.locale('vi'); } catch (e) {}

export default function DayjsSetup(): null {
  return null;
}
