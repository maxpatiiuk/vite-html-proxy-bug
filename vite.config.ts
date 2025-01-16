export default {
  test: {
    browser: {
      enabled: true,
      name: "chrome",
    },
  },
  plugins: [
    {
      name: "",
      transformIndexHtml: {
        order: "pre",
        async handler() {
          return [
            {
              tag: "script",
              attrs: {
                type: "module",
              },
              children: "export {}",
            },
          ];
        },
      },
    },
  ],
};
