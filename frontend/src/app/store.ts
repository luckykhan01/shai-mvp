import { configureStore } from "@reduxjs/toolkit";
import { eventsApi } from "@/entities/events/api";

export const store = configureStore({
  reducer: { [eventsApi.reducerPath]: eventsApi.reducer },
  middleware: (getDefault) => getDefault().concat(eventsApi.middleware),
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
