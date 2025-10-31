import React from 'react';
import {
  IconFailedCircle,
  IconGreyCircle,
  IconOrangeCircle,
  IconSuccessCircle
} from '../../utils/Icons';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

export default function CustomDate({
  selectedDate,
  greyListDates,
  redListDates,
  greenListDates,
  darkGreenListDates,
  isLoading,
  dateProps
}: {
  selectedDate: dayjs.Dayjs | null;
  greyListDates: string[];
  redListDates: string[];
  greenListDates: string[];
  darkGreenListDates: string[];
  dateProps: PickersDayProps<dayjs.Dayjs>;
  isLoading?: boolean;
}) {
  const { day, disabled } = dateProps;

  /**
   * Checks if the given day is included in the provided date list.
   * @param {string[]} dateList - List of dates in any valid date string/format.
   * @param {string | number | Date | dayjs.Dayjs | null | undefined} day - The date to format and check.
   * @returns {boolean} - Whether the formatted day exists in the date list.
   */
  const getFormattedDate = (
    dateList: string[],
    day: string | number | Date | dayjs.Dayjs | null | undefined
  ) => {
    const formattedDay = dayjs(day).format('YYYY-MM-DD');
    const date_list = dateList
      .map(
        (dateStr: string | number | Date) =>
          dayjs(dateStr).format('YYYY-MM-DDTHH:mm:ssZ[Z]').split('T')[0]
      )
      .includes(formattedDay);
    return date_list;
  };

  // Format day into a string that matches the date strings in the lists
  const isSelectedExecution = selectedDate
    ? selectedDate.date() === day.date() && selectedDate.month() === day.month()
    : false;

  const dateSelected = day
    ? new Date(day.toDate()).toDateString().split(' ')[2]
    : null;

  // Check if the date matches the respective statuses
  const isGreyExecution = getFormattedDate(greyListDates, day);
  const isRedExecution = getFormattedDate(redListDates, day);
  const isGreenExecution = getFormattedDate(greenListDates, day);
  const isDarkGreenExecution = getFormattedDate(darkGreenListDates, day);

  // Check if the day is today
  const isToday = day.isSame(new Date(), 'day');

  // Background and text color based on conditions
  let backgroundColor = 'transparent'; // Default transparent
  let borderColor = 'none';
  let textColor = 'inherit';
  let opacity = 1;
  let fontWeight = 'normal';

  // Case 1: If today is selected
  if (isToday && isSelectedExecution) {
    textColor = '#0C67DF';
    fontWeight = 'bold';

    // Set background and border colors based on execution status
    if (isGreyExecution) {
      backgroundColor = '#7474740F';
      borderColor = '2px solid #747474';
    } else if (isGreenExecution && isRedExecution) {
      backgroundColor = '#E374000F';
      borderColor = '2px solid #E37400';
    } else if (isGreenExecution && !isRedExecution) {
      backgroundColor = '#1880380F';
      borderColor = '2px solid #188038';
    } else if (isRedExecution && !isGreenExecution) {
      backgroundColor = '#B3261E0F';
      borderColor = '2px solid #B3261E';
    }
  }
  // Case 2: If today is not selected but it's today
  else if (isToday) {
    textColor = '#0C67DF';
    fontWeight = 'bold';
  }

  // Case 3: If selected date has a background color (blue, green, etc.)
  else if (isDarkGreenExecution) {
    textColor = '#454746';
    backgroundColor = '#1880380F';
    borderColor = '2px solid #188038';
  } else if (isGreyExecution && isSelectedExecution) {
    textColor = '#454746';
    backgroundColor = '#7474740F';
    borderColor = '2px solid #747474';
  } else if (isGreenExecution && isRedExecution && isSelectedExecution) {
    textColor = '#454746';
    backgroundColor = '#E374000F';
    borderColor = '2px solid #E37400';
  } else if (isGreenExecution && isSelectedExecution) {
    textColor = '#454746';
    backgroundColor = '#1880380F';
    borderColor = '2px solid #188038';
  } else if (isRedExecution && isSelectedExecution) {
    textColor = '#454746';
    backgroundColor = '#B3261E0F';
    borderColor = '2px solid #B3261E';
  }

  // Case 4: If the day is selected but without a background color (i.e., transparent background)
  if (isSelectedExecution && backgroundColor === 'transparent' && !isLoading) {
    backgroundColor = 'transparent';
    borderColor = '2px solid #3B78E7';
  }

  // Reduce opacity for past and future dates
  if (disabled) {
    opacity = 0.5;
  }

  return (
    <div className="calender-date-time-wrapper">
      <PickersDay
        {...dateProps}
        style={{
          color: textColor,
          border: borderColor,
          borderRadius:
            backgroundColor !== 'transparent' || isSelectedExecution || isToday
              ? '50%'
              : 'none',
          opacity: opacity,
          backgroundColor: backgroundColor,
          fontWeight: fontWeight,
          transition: 'border 0.3s ease-out'
        }}
        sx={{
          // Reset PickersDay's default hover styles if they conflict
          '&:hover': {
            backgroundColor: !isSelectedExecution
              ? '#1F1F1F0F !important'
              : 'transparent !important', // Suppress default PickersDay hover
            borderRadius: '50%'
          },
          // Reset selected hover if needed
          '&.Mui-selected:hover': {
            backgroundColor: 'transparent !important'
          },
          // Ensure its text color is managed by the parent div
          color: 'inherit', // Inherit color from parent div
          // Remove its own background so wrapper can control it
          backgroundColor: 'transparent',
          transition: 'none'
        }}
      />

      {/* Render status icons based on conditions */}

      {(isGreyExecution && !isSelectedExecution && !isLoading) ||
      (isGreyExecution && isToday && !isSelectedExecution && !isLoading) ? (
        <div
          className={
            dateSelected && dateSelected[0] !== '0'
              ? 'calender-status-icon'
              : 'calender-status-icon calendar-status-icon-double'
          }
        >
          <IconGreyCircle.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
      ) : (!isSelectedExecution &&
          isRedExecution &&
          isGreenExecution &&
          !isLoading) ||
        (isGreenExecution &&
          isRedExecution &&
          isToday &&
          !isSelectedExecution &&
          !isLoading) ? (
        <div
          className={
            dateSelected && dateSelected[0] !== '0'
              ? 'calender-status-icon'
              : 'calender-status-icon calendar-status-icon-double'
          }
        >
          <IconOrangeCircle.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
      ) : (!isSelectedExecution &&
          isRedExecution &&
          !isGreenExecution &&
          !isLoading) ||
        (!isGreenExecution &&
          isRedExecution &&
          isToday &&
          !isSelectedExecution &&
          !isLoading) ? (
        <div
          className={
            dateSelected && dateSelected[0] !== '0'
              ? 'calender-status-icon'
              : 'calender-status-icon calendar-status-icon-double'
          }
        >
          <IconFailedCircle.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
      ) : (!isSelectedExecution &&
          isGreenExecution &&
          !isRedExecution &&
          !isLoading) ||
        (isGreenExecution &&
          !isRedExecution &&
          isToday &&
          !isSelectedExecution &&
          !isLoading) ? (
        <div
          className={
            dateSelected && dateSelected[0] !== '0'
              ? 'calender-status-icon'
              : 'calender-status-icon calendar-status-icon-double'
          }
        >
          <IconSuccessCircle.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
      ) : (
        ((isDarkGreenExecution && !isSelectedExecution && !isLoading) ||
          (isDarkGreenExecution &&
            isToday &&
            !isSelectedExecution &&
            !isLoading)) && (
          <div
            className={
              dateSelected && dateSelected[0] !== '0'
                ? 'calender-status-icon'
                : 'calender-status-icon calendar-status-icon-double'
            }
          >
            <IconSuccessCircle.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
        )
      )}
    </div>
  );
}
