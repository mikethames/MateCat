import {getMatecatApiDomain} from '../../utils/getMatecatApiDomain'

/**
 * Update glossary item
 *
 * @param {Object} options
 * @param {string} options.idSegment
 * @param {string} options.idItem
 * @param {string} options.source
 * @param {string} options.target
 * @param {string} options.newTranslation
 * @param {string} options.comment
 * @param {string} [options.idJob=config.id_job]
 * @param {string} [options.password=config.password]
 * @param {string} [options.idClient=config.id_client]
 * @returns {Promise<object>}
 */
export const updateGlossaryItem = async ({
  idSegment,
  idItem,
  source,
  target,
  newTranslation,
  comment,
  idJob = config.id_job,
  password = config.password,
  idClient = config.id_client,
}) => {
  const dataParams = {
    exec: 'update',
    segment: source,
    translation: target,
    newsegment: source,
    newtranslation: newTranslation,
    id_item: idItem,
    comment: comment,
    id_job: idJob,
    password: password,
    id_client: idClient,
    id_segment: idSegment,
  }
  const formData = new FormData()

  Object.keys(dataParams).forEach((key) => {
    formData.append(key, dataParams[key])
  })
  const response = await fetch(`${getMatecatApiDomain()}?action=glossary`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) return Promise.reject(response)

  const {errors, ...data} = await response.json()
  if (errors && errors.length > 0) return Promise.reject(errors)

  return data
}
