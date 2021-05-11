const f = (fieldsMap) => {
  const fields = [];
  const values = [];

  Object.keys(fieldsMap).forEach(field => {
    fields.push(field);
    values.push(fieldsMap[field]);
  });

  return { fields, values };
}

class QueryBuilder {

  static update(table, fieldsToUpdate, where) {
    const { fields, values } = f(fieldsToUpdate);
    const whereFields = f(where);

    const query = `
      UPDATE ${table}
      SET ${fields.map((field, ix) => `${field} = $${ix + 1}`).join(', ')}
      WHERE ${whereFields.fields.map((field, ix) => `${field} = $${fields.length + ix + 1}`).join(' AND ')}
    `

    return {
      query,
      values: [...values, ...whereFields.values]
    }
  }
}

module.exports = QueryBuilder
